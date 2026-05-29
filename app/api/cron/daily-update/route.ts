import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Проверка наличия ключей
  if (!url || !key) {
    console.error('❌ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server configuration error: Missing keys' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const results = [];

  try {
    // 2. Пробуем получить цену Сои (самый простой тест)
    const ticker = 'ZL=F'; // Soybean Oil
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!res.ok) {
      throw new Error(`Yahoo Finance API returned ${res.status}`);
    }

    const data = await res.json();
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!price) {
      throw new Error('No price data in Yahoo response');
    }

    // Конвертация: центы за фунт -> доллары за тонну
    const finalPrice = parseFloat(((price / 100) * 2204.62).toFixed(2));

    console.log(`✅ Найдена цена сои: $${finalPrice}`);

    // 3. Пробуем записать в базу
    const { data: dbData, error: dbError } = await supabase.from('market_data').upsert({
      commodity: 'Soybean Oil (CBOT)',
      metric: 'price_spot',
      value: finalPrice,
      status: 'verified',
      sources: [{ source: 'yahoo_finance', url: `https://finance.yahoo.com/quote/${ticker}` }],
      verified_at: new Date().toISOString()
    }, { onConflict: 'commodity' });

    if (dbError) {
      console.error('❌ Ошибка записи в Supabase:', dbError);
      return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 });
    }

    results.push('Soybean Oil (CBOT)');
    console.log('✅ Данные успешно сохранены в базу');

    return NextResponse.json({ success: true, updated: results, price: finalPrice });

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
