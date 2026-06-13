// app/api/usda-balance/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Безопасный парсинг параметров
    const url = new URL(request.url);
    const commodity = url.searchParams.get('commodity');
    const region = url.searchParams.get('region');
    const metric = url.searchParams.get('metric');
    const periods = parseInt(url.searchParams.get('periods') || '12', 10);

    // 2. Проверка переменных
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: '❌ Missing SUPABASE env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Формируем запрос
    let query = supabase
      .from('balance_sheet')
      .select('commodity, region, metric, value, unit, period, updated_at, source')
      .order('period', { ascending: true });

    if (commodity) query = query.eq('commodity', commodity);
    if (region) query = query.eq('region', region);
    if (metric) query = query.eq('metric', metric);
    
    const lastPeriod = new Date().toISOString().slice(0, 7);
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - periods);
    const fromPeriod = monthsAgo.toISOString().slice(0, 7);
    query = query.gte('period', fromPeriod).lte('period', lastPeriod);

    const { data, error } = await query;
    
    if (error) throw new Error(`DB Error: ${error.message} | Code: ${error.code}`);

    // 4. Группировка для графиков
    const series = data?.reduce((acc: Record<string, any[]>, item) => {
      const key = `${item.commodity}|${item.region}|${item.metric}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ period: item.period, value: item.value });
      return acc;
    }, {}) || {};

    return NextResponse.json({
      data,
      series,
      meta: { count: data?.length || 0, filters: { commodity, region, metric, periods } }
    });

  } catch (err: any) {
    console.error('💥 API CRASH:', err);
    // ⚠️ Временно возвращаем ошибку клиенту для отладки
    return NextResponse.json({ 
      error: err.message || 'Unknown server error',
      hint: 'Check Supabase table "balance_sheet", RLS policies, and env vars.'
    }, { status: 500 });
  }
}

// POST оставляем как есть (для крона/админки)
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Expected array of records' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase.from('balance_sheet').upsert(updates, { onConflict: 'commodity,region,metric,period' });
    
    if (error) throw error;
    return NextResponse.json({ success: true, updated: updates.length });
  } catch (err: any) {
    console.error('💥 POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
