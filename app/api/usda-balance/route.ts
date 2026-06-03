import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const apiKey = process.env.USDA_API_KEY;
  
  if (!apiKey) {
    console.error("USDA_API_KEY is missing in environment variables");
    return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Тестовый запрос: Соевое масло в США
    const currentYear = new Date().getFullYear();
    const url = `https://apps.fas.usda.gov/OpenData/api/psd?commodity_code=2222000&country_code=US&attribute_id=1,5,6,8&market_year=${currentYear}&api_key=${apiKey}`;

    console.log("Requesting USDA data...");

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OilsTerminal/1.0 (alekseyudovenko@example.com)', // USDA требует email или имя приложения
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`USDA API Error: ${res.status} - ${errorText}`);
      return NextResponse.json({ 
        error: `USDA API returned ${res.status}`, 
        details: errorText,
        hint: "Check your API Key and ensure it has no spaces."
      }, { status: 500 });
    }

    const data = await res.json();
    console.log("Success! Records found:", data.length);

    if (data.length === 0) {
      return NextResponse.json({ message: 'No data found for this query' });
    }

    // Обрабатываем данные
    const row = {
      commodity: 'Soybean Oil',
      country: 'US',
      production: 0,
      exports: 0,
      imports: 0,
      consumption: 0,
      updated_at: new Date().toISOString()
    };

    data.forEach((d: any) => {
      if (d.attribute_id === '1') row.production = d.value;
      if (d.attribute_id === '5') row.exports = d.value;
      if (d.attribute_id === '6') row.imports = d.value;
      if (d.attribute_id === '8') row.consumption = d.value;
    });

    // Сохраняем в Supabase
    const { error: dbError } = await supabase.from('usda_balance_data').upsert(row, { onConflict: 'commodity,country' });
    
    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Database save failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: row });

  } catch (error) {
    console.error('Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
