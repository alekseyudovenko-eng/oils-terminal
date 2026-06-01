import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];

  try {
    // Тикеры: Соя (ZL=F), Рапс (RS=F), Пальма (FCPO=F)
    const tickers = [
      { name: 'Soybean Oil (CBOT)', ticker: 'ZL=F', type: 'soy' },
      { name: 'Rapeseed Oil (ICE)', ticker: 'RS=F', type: 'rapeseed' },
      { name: 'Palm Oil (Bursa)', ticker: 'FCPO=F', type: 'palm' }
    ];

    for (const item of tickers) {
      try {
        // Используем более "человеческий" User-Agent и headers
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1d`, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
          },
          next: { revalidate: 60 } // Кэшируем на 60 секунд
        });
        
        if (!res.ok) {
          console.error(`Failed to fetch ${item.ticker}: ${res.status}`);
          continue;
        } 
        
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price) {
          let finalPrice = price;
          
          // Конвертация
          if (item.type === 'soy') {
            // ZL=F: центы за фунт -> USD за тонну
            finalPrice = (price / 100) * 2204.62;
          } else if (item.type === 'palm') {
            // FCPO=F: MYR за тонну -> USD за тонну
            // Курс MYR/USD плавающий, берем приблизительный 4.75 для стабильности, если нет live-курса
            finalPrice = price / 4.75; 
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
