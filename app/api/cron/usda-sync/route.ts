// app/api/cron/usda-sync/route.ts — OFFICIAL USDA PSD API v2
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 🔹 7-значные коды товаров (ОФИЦИАЛЬНЫЕ из Swagger UI)
const COMMODITIES = [
  { usdaCode: '0422000', name: 'palm', label: 'Palm Oil' },
  { usdaCode: '0442000', name: 'soybean', label: 'Soybean Oil' },
  { usdaCode: '0462000', name: 'sunflower', label: 'Sunflower Seed Oil' },
  { usdaCode: '0432000', name: 'rapeseed', label: 'Rapeseed Oil' }
];

// 🔹 2-буквенные коды стран
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

// 🔹 AttributeId → наша метрика (из официальной документации)
const ATTRIBUTE_MAP: Record<number, string> = {
  1: 'ending_stocks',      // Beginning Stocks
  2: 'production',         // Production  
  5: 'imports',            // Imports
  6: 'exports',            // Exports
  9: 'consumption'         // Domestic Consumption
};

// 🔹 ОФИЦИАЛЬНЫЙ запрос к USDA PSD API v2
async function fetchUSDAData(commodityCode: string, countryCode: string, marketYear: number, apiKey: string) {
  // ✅ ПРАВИЛЬНЫЙ базовый URL из Swagger UI
  const baseUrl = 'https://apps.fas.usda.gov/opendatawebV2/api/psd';
  const url = `${baseUrl}/commodity/${commodityCode}/country/${countryCode}/year/${marketYear}?api_key=${apiKey}`;
  
  console.log(`🔍 USDA Request: ${url.replace(apiKey, '***')}`);
  
  const res = await fetch(url, { 
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 86400 }
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => 'no body');
    if (res.status === 404) {
      console.warn(`⚠️ USDA 404: ${commodityCode}/${countryCode}/${marketYear}`);
    }
    throw new Error(`USDA API HTTP ${res.status}: ${text.slice(0, 150)}`);
  }
  
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const queryKey = url.searchParams.get('key');
  const expected = (process.env.CRON_SECRET || '').trim();
  const received = authHeader.replace('Bearer ', '').trim();
  
  const isAuthorized = (received && received === expected) || (queryKey && queryKey === expected);
  
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      debug: true,
      expected: `${expected.slice(0,3)}***${expected.slice(-3)}`,
      match: received === expected || queryKey === expected
    });
  }
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const usdaApiKey = process.env.USDA_API_KEY;
    if (!usdaApiKey) throw new Error('Missing USDA_API_KEY');
    
    let inserted = 0, errors = 0;
    const log: string[] = [];
    const years = [2024, 2025, 2026];
    
    for (const comm of COMMODITIES) {
      for (const region of REGIONS) {
        for (const year of years) {
          try {
            const records = await fetchUSDAData(comm.usdaCode, region.usdaCode, year, usdaApiKey);
            
            if (records.length === 0) continue;
            
            for (const rec of records) {
              const attrId = rec.AttributeId;
              const metricName = ATTRIBUTE_MAP[attrId];
              if (!metricName) continue;
              
              const rawValue = rec.Value;
              if (rawValue == null || rawValue === 0) continue;
              
              // USDA возвращает в 1000 MT → оставляем как есть
              const valueInKt = +Number(rawValue).toFixed(2);
              
              const month = rec.Month ? String(rec.Month).padStart(2, '0') : '01';
              const period = `${year}-${month}`;
              
              const { error } = await supabase.from('balance_sheet').upsert({
                commodity: comm.name, 
                region: region.name, 
                metric: metricName,
                value: valueInKt, 
                unit: '000 MT', 
                period, 
                source: 'USDA PSD API',
                updated_at: new Date().toISOString()
              }, { onConflict: 'commodity,region,metric,period' });
              
              if (error) { errors++; console.error(error.message); } 
              else { inserted++; }
            }
            if (records.length > 0) {
              log.push(`✅ ${comm.label}/${region.label}/${year}: ${records.length} recs`);
            }
          } catch (e: any) { 
            if (!e.message.includes('404')) {
              errors++; 
              log.push(`❌ ${comm.label}/${region.label}/${year}: ${e.message.slice(0, 80)}`); 
            }
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      inserted, 
      errors, 
      log: log.slice(0, 30), 
      timestamp: new Date().toISOString() 
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
