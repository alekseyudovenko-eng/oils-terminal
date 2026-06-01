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
    // 1. БИРЖЕВЫЕ ДАННЫЕ (Соя и Рапс - самые надежные на Yahoo)
    const tickers = [
      { name: 'Soybean Oil (CBOT)', ticker: 'ZL=F', type: 'soy' },
      { name: 'Rapeseed Oil (ICE)', ticker: 'RS=F', type: 'rapeseed' }
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
          // ZL=F (Соя): центы за фунт -> USD за тонну
          if (item.type === 'soy') {
            finalPrice = (price / 100) * 2204.62;
          }
          // RS=F (Рапс): обычно USD за тонну

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

    // 2. ПАЛЬМОВОЕ МАСЛО (Ищем через Tavily, так как Yahoo часто сбоит для FCPO)
    // Запрос направлен на поиск цены в USD за метрическую тонну
    try {
      const response = await tvly.search("palm oil futures price USD per metric ton today site:investing.com OR site:tradingeconomics.com", {
        searchDepth: "advanced",
        maxResults: 3,
        includeAnswer: true
      });

      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      // Ищем числа в диапазоне 800-1200 (реалистичная цена за тонну в USD)
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      let palmPrice = 0;
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val > 800 && val < 1200) {
            palmPrice = val;
            break;
          }
        }
      }

      // Если через поиск не нашли, пробуем Yahoo с другим тикером (CL=F иногда используют как прокси, но это нефть, так что лучше не надо)
      // Оставим цену из поиска, если она найдена
      
      if (palmPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: 'Palm Oil (Bursa)',
          metric: 'price_spot',
          value: parseFloat(palmPrice.toFixed(2)),
          status: 'verified',
          sources: [{ source: 'tavily_search_investing', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        results.push('Palm Oil (Bursa)');
      } else {
        console.log("Palm oil price not found via search");
      }

    } catch (e) { console.error("Error searching Palm Oil", e); }

    return NextResponse.json({ success: true, updated: results });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
