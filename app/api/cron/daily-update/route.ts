import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import yahooFinance from 'yahoo-finance2';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Получаем реальную котировку с Yahoo Finance (Тикер ZL=F - Soybean Oil Futures)
    const quote = await yahooFinance.quote('ZL=F');
    
    if (!quote || !quote.regularMarketPrice) {
      throw new Error("No price data received from Yahoo Finance");
    }

    // Yahoo дает цену за фунт (cents per pound). Например, 76.50 центов.
    const pricePerPoundCents = quote.regularMarketPrice; 
    
    // 2. Конвертируем в доллары за метрическую тонну
    // 1 метрическая тонна = 2204.62 фунта
    // Цена в долларах за фунт = pricePerPoundCents / 100
    // Цена за тонну = (pricePerPoundCents / 100) * 2204.62
    
    const pricePerTon = (pricePerPoundCents / 100) * 2204.62;
    const finalPrice = parseFloat(pricePerTon.toFixed(2));

    // 3. Записываем в базу
    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (CBOT)',
      metric: 'price_spot',
      value: finalPrice,
      status: 'verified',
      sources: [{ source: 'yahoo_finance_live', url: 'https://finance.yahoo.com/quote/ZL=F' }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: finalPrice, unit: 'USD per Metric Ton' });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'FAILED TO FETCH LIVE PRICE' }, { status: 500 });
  }
}
