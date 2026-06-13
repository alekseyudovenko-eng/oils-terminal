// app/api/usda-balance/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// 🟢 GET: Получение данных
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const commodity = searchParams.get('commodity') || null;
  const region = searchParams.get('region') || null;
  const metric = searchParams.get('metric') || null;
  const periods = parseInt(searchParams.get('periods') || '12', 10);

  try {
    let query = supabase
      .from('balance_sheet')
      .select('commodity, region, metric, value, unit, period, updated_at, source')
      .order('period', { ascending: true });

    if (commodity) query = query.eq('commodity', commodity);
    if (region) query = query.eq('region', region);
    if (metric) query = query.eq('metric', metric);
    
    // Динамический фильтр по периодам
    const lastPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - periods);
    const fromPeriod = monthsAgo.toISOString().slice(0, 7);
    
    query = query.gte('period', fromPeriod).lte('period', lastPeriod);

    const { data, error } = await query;
    if (error) throw error;

    // Группировка для графиков
    const series = data?.reduce((acc: Record<string, any[]>, item) => {
      const key = `${item.commodity}|${item.region}|${item.metric}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ period: item.period, value: item.value });
      return acc;
    }, {}) || {};

    return NextResponse.json({
      data,
      series,
      meta: {
        count: data?.length || 0,
        filters: { commodity, region, metric, periods },
        timestamp: new Date().toISOString()
      }
    });

  } catch (e) {
    console.error('❌ Balance GET Error:', e);
    return NextResponse.json({ error: 'Failed to fetch balance data' }, { status: 500 });
  }
}

// 🔴 POST: Обновление/вставка данных (защищён ключом)
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

    const { data, error } = await supabase
      .from('balance_sheet')
      .upsert(updates, { onConflict: 'commodity,region,metric,period' });
    
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      updated: updates.length,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error('❌ Balance POST Error:', e);
    return NextResponse.json({ error: 'Failed to update balance data' }, { status: 500 });
  }
}
