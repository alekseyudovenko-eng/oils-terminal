import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Делаем запрос к публичному API Yahoo Finance для тикера ZL=F (Soybean Oil)
    // Используем query1.finance.yahoo.com, который отдает JSON
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/ZL=F?interval=1d&range=1d', {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Притворяемся браузером, чтобы не заблокировали
      }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch from Yahoo Finance');
    }

    const data = await res.json();
    
    // 2. Извлекаем цену
    const result = data.chart?.result?.[0];
    const pricePerPoundCents = result?.meta?.regularMarketPrice;

    if (!pricePerPoundCents) {
      throw new Error('No price data in response');
    }

    // 3. Конвертируем: центы за фунт -> доллары за метрическую тонну
    // 1 тонна = 2204.62 фунта
    const pricePerTon = (pricePerPoundCents / 100) * 2204.62;
    const finalPrice = parseFloat(pricePerTon.toFixed(2));

    // 4. Записываем в базу
    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (CBOT)',
      metric: 'price_spot',
      value: finalPrice,
      status: 'verified',
      sources: [{ source: 'yahoo_finance_api', url: 'https://finance.yahoo.com/quote/ZL=F' }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: finalPrice });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'FAILED TO FETCH LIVE PRICE' }, { status: 500 });
  }
}
