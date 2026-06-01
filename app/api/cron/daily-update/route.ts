import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];

  try {
    // 1. БИРЖЕВЫЕ ДАННЫЕ
    const tickers = [
      { name: 'Soybean Oil (CBOT)', ticker: 'ZL=F', type: 'soy' },
      { name: 'Rapeseed Oil (ICE)', ticker: 'RS=F', type: 'rapeseed' },
      { name: 'Palm Oil (Bursa)', ticker: 'FCPO=F', type: 'palm' } // Добавили Пальму
    ];

    for (const item of tickers) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!res.ok) continue; 
        
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price) {
          let finalPrice = price;
          
          // Конвертация валют и единиц
          if (item.type === 'soy') {
            // ZL=F: центы за фунт -> USD за тонну
            finalPrice = (price / 100) * 2204.62;
          } else if (item.type === 'palm') {
            // FCPO=F: MYR за тонну -> USD за тонну (курс ~4.7)
            finalPrice = price / 4.7; 
          }
          // RS=F (Рапс): обычно сразу в USD за тонну

          await supabase.from('market_data').upsert({
            commodity: item.name,
            metric: 'price_spot',
            value: parseFloat(finalPrice.toFixed(2)),
            status: 'verified',
            sources: [{ source: 'yahoo_finance', url: `https://finance.yahoo.com/quote/${item.ticker}` }],
            verified_at: new Date().toISOString()
          }, { onConflict: 'commodity' });
          
          results.push(item.name);
        }
      } catch (e) { console.error(`Error fetching ${item.name}`, e); }
    }

    return NextResponse.json({ success: true, updated: results });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
