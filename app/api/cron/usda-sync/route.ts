// app/api/cron/usda-sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 🔹 Маппинг товаров и регионов для USDA API
const COMMODITIES = [
  { usdaCode: 42, name: 'palm', label: 'Palm Oil' },
  { usdaCode: 44, name: 'soybean', label: 'Soybean Oil' },
  { usdaCode: 46, name: 'sunflower', label: 'Sunflower Seed Oil' },
  { usdaCode: 43, name: 'rapeseed', label: 'Rapeseed Oil' }
];

const REGIONS = [
  { usdaCode: 'XX', name: 'global', label: 'World' },
  { usdaCode: 'ID', name: 'indonesia', label: 'Indonesia' },
  { usdaCode: 'MY', name: 'malaysia', label: 'Malaysia' },
  { usdaCode: 'EE', name: 'eu', label: 'European Union' },
  { usdaCode: 'UP', name: 'ukraine', label: 'Ukraine' },
  { usdaCode: 'KS', name: 'central_asia', label: 'Kazakhstan' }, // ближайший аналог в USDA
  { usdaCode: 'AJ', name: 'caucasus', label: 'Azerbaijan' }      // ближайший аналог в USDA
];

const METRICS = [
  { usdaField: 'beginning_stocks', name: 'ending_stocks' }, // USDA даёт beginning, мы храним как ending для простоты
  { usdaField: 'production', name: 'production' },
  { usdaField: 'consumption', name: 'consumption' },
  { usdaField: 'exports', name: 'exports' },
  { usdaField: 'imports', name: 'imports' }
];

async function fetchUSDA(commodityCode: number, countryCode: string, apiKey: string) {
  const url = `https://apps.fas.usda.gov/psdonline/api/v1/commodity/${commodityCode}/country/${countryCode}/measure/M/years/2025,2026?api_key=${apiKey}`;
  
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`USDA HTTP ${res.status}`);
  
  const data = await res.json();
  return data.data || [];
}

export async function GET(request: Request) {
  // 🔐 Защита крона
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing USDA_API_KEY' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let inserted = 0;
  let errors = 0;

  try {
    for (const comm of COMMODITIES) {
      for (const region of REGIONS) {
        try {
          const records = await fetchUSDA(comm.usdaCode, region.usdaCode, apiKey);
          
          for (const rec of records) {
            const year = rec.year;
            const month = rec.month; // 1-12
            const period = `${year}-${String(month).padStart(2, '0')}`; // "2026-05"
            
            for (const metric of METRICS) {
              const value = rec[metric.usdaField];
              if (value === null || value === undefined) continue;
              
              // USDA возвращает в метрических тоннах, мы храним в 000' MT
              const valueInKt = +(value / 1000).toFixed(2);
              
              const { error } = await supabase.from('balance_sheet').upsert({
                commodity: comm.name,
                region: region.name,
                metric: metric.name,
                value: valueInKt,
                unit: '000 MT',
                period,
                source: 'USDA PSD API'
              }, { onConflict: 'commodity,region,metric,period' });
              
              if (error) {
                console.error(`❌ Upsert failed: ${error.message}`);
                errors++;
              } else {
                inserted++;
              }
            }
          }
        } catch (e) {
          console.warn(`⚠️ Failed ${comm.label} / ${region.label}:`, e);
          errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('💥 Cron crash:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
