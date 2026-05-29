import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const results = [];

  try {
    // 1. БИРЖЕВЫЕ ДАННЫЕ (Соя и Рапс)
    const tickers = [
      { name: 'Soybean Oil (CBOT)', ticker: 'ZL=F', type: 'soy' },
      { name: 'Rapeseed Oil (ICE)', ticker: 'RS=F', type: 'rapeseed' }
    ];

    for (const item of tickers) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!res.ok) continue; // Пропускаем, если Yahoo не ответил
        
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price) {
          let finalPrice = price;
          // ZL=F (Соя) идет в центах за фунт. Конвертируем в $/тонну.
          if (item.type === 'soy') {
            finalPrice = (price / 100) * 2204.62;
          }
          // RS=F (Рапс) обычно сразу в долларах за тонну на ICE.

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

    // 2. ПОИСК ОСТАЛЬНЫХ МАСЕЛ (Через Tavily)
    const searchItems = [
      { name: 'Palm Oil', query: 'palm oil futures price USD per metric ton Malaysia today', min: 800, max: 1500 },
      { name: 'Sunflower Oil', query: 'sunflower oil export price FOB Black Sea USD per metric ton recent', min: 900, max: 1600 },
      { name: 'Olive Oil', query: 'olive oil spot price Europe USD per metric ton 2026', min: 3000, max: 12000 }
    ];

    for (const item of searchItems) {
      try {
        const response = await tvly.search(item.query, {
          searchDepth: "advanced",
          maxResults: 3,
          includeAnswer: true
        });
        
        const text = (response.answer || "") + " " + JSON.stringify(response.results);
        const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
        
        let foundPrice = 0;
        if (matches) {
          for (const m of matches) {
            const val = parseFloat(m.replace(/,/g, ''));
            if (val >= item.min && val <= item.max) {
              foundPrice = val;
              break;
            }
          }
        }

        if (foundPrice > 0) {
          await supabase.from('market_data').upsert({
            commodity: item.name,
            metric: 'price_spot',
            value: foundPrice,
            status: 'estimated',
            sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
            verified_at: new Date().toISOString()
          }, { onConflict: 'commodity' });
          results.push(item.name);
        }
      } catch (e) { console.error(`Error searching ${item.name}`, e); }
    }

    return NextResponse.json({ success: true, updated: results });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
