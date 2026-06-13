// app/api/cron/usda-sync/route.ts — BULLETPROOF VERSION
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ... (COMMODITIES, REGIONS, METRICS, fetchUSDAData — без изменений, код из прошлого сообщения) ...
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
  { usdaCode: 'KS', name: 'central_asia', label: 'Kazakhstan' },
  { usdaCode: 'AJ', name: 'caucasus', label: 'Azerbaijan' },
  { usdaCode: 'PL', name: 'poland', label: 'Poland' },
  { usdaCode: 'BU', name: 'bulgaria', label: 'Bulgaria' },
  { usdaCode: 'RO', name: 'romania', label: 'Romania' },
  { usdaCode: 'RI', name: 'serbia', label: 'Serbia' }
];
const METRICS = [
  { usdaField: 'beginning_stocks', name: 'ending_stocks' },
  { usdaField: 'production', name: 'production' },
  { usdaField: 'domestic_consumption', name: 'consumption' },
  { usdaField: 'exports', name: 'exports' },
  { usdaField: 'imports', name: 'imports' }
];
async function fetchUSDAData(commodityCode: number, countryCode: string, apiKey: string) {
  const url = `https://apps.fas.usda.gov/psdonline/api/v1/commodity/${commodityCode}/country/${countryCode}/measure/M/years/2024,2025,2026?api_key=${apiKey}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`USDA API HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  // 🔍 DEBUG: Показываем, что пришло
  const authHeader = request.headers.get('authorization') || '';
  const queryKey = url.searchParams.get('key'); // ← запасной вход для тестов
  const expected = (process.env.CRON_SECRET || '').trim();
  const received = authHeader.replace('Bearer ', '').trim();
  
  // 🔐 Проверка: через заголовок ИЛИ через query param (для тестов)
  const isAuthorized = 
    (received && received === expected) || 
    (queryKey && queryKey === expected);
  
  // Если включен режим отладки — показываем инфу и пропускаем
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      debug: true,
      expected: `${expected.slice(0,3)}***${expected.slice(-3)}`,
      receivedHeader: authHeader ? `${authHeader.slice(0,20)}...` : 'MISSING',
      receivedTrimmed: received ? `${received.slice(0,3)}***${received.slice(-3)}` : 'MISSING',
      queryKey: queryKey ? `${queryKey.slice(0,3)}***${queryKey.slice(-3)}` : 'NOT SENT',
      match: received === expected,
      hint: 'If match:false → check for hidden spaces in Vercel env var value'
    });
  }
  
  if (!isAuthorized) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      debug: {
        expectedLength: expected.length,
        receivedLength: received.length,
        queryKeySent: !!queryKey
      }
    }, { status: 401 });
  }

  // ✅ Авторизация прошла — выполняем синхронизацию
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const usdaApiKey = process.env.USDA_API_KEY;
    if (!usdaApiKey) throw new Error('Missing USDA_API_KEY');
    
    let inserted = 0, errors = 0;
    const log: string[] = [];
    
    for (const comm of COMMODITIES) {
      for (const region of REGIONS) {
        try {
          const records = await fetchUSDAData(comm.usdaCode, region.usdaCode, usdaApiKey);
          if (records.length === 0) { log.push(`⚠️ No data: ${comm.label}/${region.label}`); continue; }
          
          for (const rec of records) {
            const year = rec.year, month = rec.month;
            if (!year || !month) continue;
            const period = `${year}-${String(month).padStart(2,'0')}`;
            
            for (const metric of METRICS) {
              const val = rec[metric.usdaField];
              if (val == null || val === 0) continue;
              const valueInKt = +(val / 1000).toFixed(2);
              
              const { error } = await supabase.from('balance_sheet').upsert({
                commodity: comm.name, region: region.name, metric: metric.name,
                value: valueInKt, unit: '000 MT', period, source: 'USDA PSD API',
                updated_at: new Date().toISOString()
              }, { onConflict: 'commodity,region,metric,period' });
              
              if (error) { errors++; console.error(error.message); } 
              else { inserted++; }
            }
          }
          log.push(`✅ ${comm.label}/${region.label}: ${records.length} recs`);
        } catch (e: any) { errors++; log.push(`❌ ${comm.label}/${region.label}: ${e.message}`); }
      }
    }
    
    return NextResponse.json({ success: true, inserted, errors, log: log.slice(0,10), timestamp: new Date().toISOString() });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
