import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Коды товаров USDA (FAS Commodity Codes)
const COMMODITIES = [
  { code: '2222000', name: 'Soybean Oil' },
  { code: '2422000', name: 'Palm Oil' },
  { code: '2261000', name: 'Rapeseed Oil' },
  { code: '2251000', name: 'Sunflower Oil' }
];

// Основные страны-производители/экспортеры (коды ISO)
const COUNTRIES = ['US', 'MY', 'ID', 'BR', 'AR', 'CA', 'EU', 'UA', 'RU']; 

export async function GET() {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'USDA API Key missing' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];

  try {
    const currentYear = new Date().getFullYear();
    
    for (const comm of COMMODITIES) {
      // Запрос к USDA PSD API
      const url = `https://apps.fas.usda.gov/OpenData/api/psd?commodity_code=${comm.code}&country_code=${COUNTRIES.join(',')}&attribute_id=1,5,6,8&market_year=${currentYear}&api_key=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`USDA API Error for ${comm.name}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      
      // Группируем данные по странам
      const countryData: any = {};
      
      data.forEach((item: any) => {
        const country = item.country_code;
        if (!countryData[country]) {
          countryData[country] = {
            country: country,
            commodity: comm.name,
            production: 0,
            exports: 0,
            imports: 0,
            consumption: 0
          };
        }

        if (item.attribute_id === '1') countryData[country].production = item.value;
        if (item.attribute_id === '5') countryData[country].exports = item.value;
        if (item.attribute_id === '6') countryData[country].imports = item.value;
        if (item.attribute_id === '8') countryData[country].consumption = item.value;
      });

      // Сохраняем в Supabase
      for (const key in countryData) {
        const row = countryData[key];
        
        await supabase.from('usda_balance_data').upsert({
          commodity: row.commodity,
          country: row.country,
          production: row.production,
          exports: row.exports,
          imports: row.imports,
          consumption: row.consumption,
          updated_at: new Date().toISOString()
        }, { onConflict: 'commodity,country' });
        
        results.push(row);
      }
    }

    return NextResponse.json({ success: true, count: results.length });

  } catch (error) {
    console.error('USDA Balance Error:', error);
    return NextResponse.json({ error: 'Failed to fetch USDA data' }, { status: 500 });
  }
}
