// app/api/market-data/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 🔹 Коэффициенты конвертации (можно позже вынести в ENV или отдельную таблицу)
const RATES = { MYR_USD: 0.22, EUR_USD: 1.08, CENTS_LB_TO_USD_MT: 22.0462 };

function convertPrice(price: number, currency: string, unit: string, targetCurrency: string) {
  let usdValue = price;
  if (currency === 'MYR') usdValue *= RATES.MYR_USD;
  if (unit === 'cents/lb') usdValue *= RATES.CENTS_LB_TO_USD_MT;
  if (currency === 'EUR') usdValue *= RATES.EUR_USD;

  if (targetCurrency === 'MYR') return +(usdValue / RATES.MYR_USD).toFixed(2);
  if (targetCurrency === 'EUR') return +(usdValue / RATES.EUR_USD).toFixed(2);
  return +usdValue.toFixed(2);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const currency = url.searchParams.get('currency') || 'USD';
    const period = url.searchParams.get('period') || '30d';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Последние котировки (по 1 на каждый символ)
    const { data: latest, error: latestErr } = await supabase
      .from('market_prices')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(4);

    if (latestErr) throw latestErr;

    // 2. История для графика
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: history, error: histErr } = await supabase
      .from('market_prices')
      .select('symbol, price, currency, unit, timestamp')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: true });

    if (histErr) throw histErr;

    // 3. Форматирование + конвертация
    const formattedLatest = latest?.map(item => ({
      ...item,
      convertedPrice: convertPrice(item.price, item.currency, item.unit, currency),
      convertedChange: convertPrice(item.change_val, item.currency, item.unit, currency)
    })) || [];

    const formattedHistory = history?.map(item => ({
      ...item,
      convertedPrice: convertPrice(item.price, item.currency, item.unit, currency),
      date: new Date(item.timestamp).toLocaleDateString('en-CA')
    })) || [];

    return NextResponse.json({
      prices: formattedLatest,
      history: formattedHistory,
      meta: { currency, period, updated: new Date().toISOString() }
    });

  } catch (err: any) {
    console.error('💥 Market Data API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: обновление цен (защищён INTERNAL_API_KEY)
export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    if (!Array.isArray(payload)) throw new Error('Expected array');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from('market_prices').insert(payload);
    if (error) throw error;

    return NextResponse.json({ success: true, inserted: payload.length });
  } catch (err: any) {
    console.error('💥 Market Data POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
