// app/api/cron/usda-sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 🔹 Маппинг товаров (USDA commodity codes)
const COMMODITIES = [
  { usdaCode: 42, name: 'palm', label: 'Palm Oil' },
  { usdaCode: 44, name: 'soybean', label: 'Soybean Oil' },
  { usdaCode: 46, name: 'sunflower', label: 'Sunflower Seed Oil' },
  { usdaCode: 43, name: 'rapeseed', label: 'Rapeseed Oil' }
];

// 🔹 Маппинг регионов (USDA country codes)
const REGIONS = [
  { usdaCode: 'XX', name: 'global', label: 'World' },
  { usdaCode: 'ID', name: 'indonesia', label: 'Indonesia' },
  { usdaCode: 'MY', name: 'malaysia', label: 'Malaysia' },
  { usdaCode: 'EE', name: 'eu', label: 'European Union' },
  { usdaCode: 'UP', name: 'ukraine', label: 'Ukraine' },
  { usdaCode: 'KS', name: 'central_asia', label: 'Kazakhstan' },
  { usdaCode: 'AJ', name: 'caucasus', label: 'Azerbaijan' },
  { usdaCode: 'PL', name: 'poland', label: 'Poland' },
  { usdaCode: 'BU', name: 'bulgaria', label: 'Bulgaria' },
  { usdaCode: 'RO', name: 'romania', label: 'Romania' },
  { usdaCode: 'RI', name: 'serbia', label: 'Serbia' }
];

// 🔹 Маппинг метрик (USDA field → наша таблица)
const METRICS = [
  { usdaField: 'beginning_stocks', name: 'ending_stocks' }, // USDA даёт beginning, храним как ending
  { usdaField: 'production', name: 'production' },
  { usdaField: 'domestic_consumption', name: 'consumption' },
  { usdaField: 'exports', name: 'exports' },
  { usdaField: 'imports', name: 'imports' }
];

async function fetchUSDAData(commodityCode: number, countryCode: string, apiKey: string) {
  // Запрашиваем данные за 2024-2026 годы (USDA обновляет прогнозы ежемесячно)
  const url = `https://apps.fas.usda.gov/psdonline/api/v1/commodity/${commodityCode}/country/${countryCode}/measure/M/years/2024,2025,2026?api_key=${apiKey}`;
  
  const res = await fetch(url, { 
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 86400 } // кэш на 24 часа
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => 'no body');
    throw new Error(`USDA API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  
  const json = await res.json();
  return json.data || [];
}

export async function GET(request: Request) {
  // 🔐 Проверка авторизации крона
  const auth = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usdaApiKey = process.env.USDA_API_KEY;
  if (!usdaApiKey) {
    return NextResponse.json({ error: 'Missing USDA_API_KEY in environment variables' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const log: string[] = [];

  try {
    for (const comm of COMMODITIES) {
      for (const region of REGIONS) {
        try {
          const records = await fetchUSDAData(comm.usdaCode, region.usdaCode, usdaApiKey);
          
          if (records.length === 0) {
            log.push(`⚠️ No data for ${comm.label} / ${region.label}`);
            continue;
          }

          for (const rec of records) {
            const year = rec.year;
            const month = rec.month;
            if (!year || !month) continue;
            
            const period = `${year}-${String(month).padStart(2, '0')}`; // "2026-05"
            
            for (const metric of METRICS) {
              const rawValue = rec[metric.usdaField];
              // Пропускаем пустые или нулевые значения
              if (rawValue === null || rawValue === undefined || rawValue === 0) continue;
              
              // USDA возвращает в метрических тоннах → конвертируем в 000' MT
              const valueInKt = +(rawValue / 1000).toFixed(2);
              
              const payload = {
                commodity: comm.name,
                region: region.name,
                metric: metric.name,
                value: valueInKt,
                unit: '000 MT',
                period,
                source: 'USDA PSD API',
                updated_at: new Date().toISOString()
              };

              // upsert: если запись есть — обновляем, если нет — вставляем
              const { error } = await supabase
                .from('balance_sheet')
                .upsert(payload, { 
                  onConflict: 'commodity,region,metric,period',
                  ignoreDuplicates: false 
                });
              
              if (error) {
                console.error(`❌ Upsert failed: ${error.message}`);
                errors++;
              } else {
                // Проверяем, была ли это вставка или обновление
                if (error === null) {
                  // Простая эвристика: если запись новая — inserted, иначе updated
                  inserted++;
                }
              }
            }
          }
          log.push(`✅ ${comm.label} / ${region.label}: ${records.length} records processed`);
        } catch (e: any) {
          console.warn(`⚠️ Failed ${comm.label} / ${region.label}:`, e.message);
          errors++;
          log.push(`❌ ${comm.label} / ${region.label}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: { inserted, updated, errors },
      log: log.slice(0, 20), // первые 20 записей лога
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('💥 Cron crash:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
