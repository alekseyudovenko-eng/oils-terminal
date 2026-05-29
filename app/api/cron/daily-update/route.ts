import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

// Тикеры Yahoo Finance (Биржевые данные)
const YAHOO_TICKERS = {
  soybean: 'ZL=F',   // Soybean Oil (CBOT) - USD/ton (via conversion)
  rapeseed: 'RS=F',  // Canola/Rapeseed Oil (ICE) - USD/ton
  palm: 'FCPO=F',    // Palm Oil (Bursa Malaysia) - MYR/ton (needs conversion)
};

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const results = [];

  try {
    // 1. Биржевые данные (Соя, Рапс, Пальма)
    for (const [key, ticker] of Object.entries(YAHOO_TICKERS)) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price) {
          let finalPrice = 0;
          let currency = 'USD';

          if (key === 'soybean') {
            // ZL=F: центы за фунт -> USD за тонну
            finalPrice = (price / 100) * 2204.62;
          } else if (key === 'rapeseed') {
            // RS=F: обычно в USD за тонну на ICE
            finalPrice = price;
          } else if (key === 'palm') {
            // FCPO=F: Malaysian Ringgit (MYR) за тонну. Конвертируем в USD (курс ~4.7)
            finalPrice = price / 4.7; 
          }

          await supabase.from('market_data').upsert({
            commodity: key === 'soybean' ? 'Soybean Oil' : key === 'rapeseed' ? 'Rapeseed Oil' : 'Palm Oil',
            metric: 'price_spot',
            value: parseFloat(finalPrice.toFixed(2)),
            status: 'verified',
            sources: [{ source: 'yahoo_finance', url: `https://finance.yahoo.com/quote/${ticker}` }],
            verified_at: new Date().toISOString()
          }, { onConflict: 'commodity' }); // Обновляем существующую запись
          
          results.push(key);
        }
      } catch (e) { console.error(`Error fetching ${key}`, e); }
    }

    // 2. Подсолнечное масло (Sunflower Oil) - самого сложного
    // Ищем актуальные цены FOB Black Sea через Tavily
    try {
      const response = await tvly.search("sunflower oil price FOB Black Sea USD per metric ton recent", {
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
          // Реалистичная цена на подсолнечное масло: $900 - $1300
          if (val > 900 && val < 1500) {
            foundPrice = val;
            break;
          }
        }
      }

      if (foundPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: 'Sunflower Oil',
          metric: 'price_spot',
          value: foundPrice,
          status: 'estimated',
          sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        results.push('sunflower');
      }
    } catch (e) { console.error("Error searching sunflower", e); }

    // 3. Оливковое масло (Olive Oil) - спотовый рынок
    try {
      const response = await tvly.search("olive oil spot price Europe USD per metric ton 2026", {
        searchDepth: "basic",
        maxResults: 3
      });
      
      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      let foundPrice = 0;
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          // Оливка дорогая: $3000 - $10000+
          if (val > 3000 && val < 12000) {
            foundPrice = val;
            break;
          }
        }
      }

      if (foundPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: 'Olive Oil',
          metric: 'price_spot',
          value: foundPrice,
          status: 'estimated',
          sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        results.push('olive');
      }
    } catch (e) { console.error("Error searching olive", e); }

    return NextResponse.json({ success: true, updated: results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
