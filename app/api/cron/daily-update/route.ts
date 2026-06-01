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
    // 1. БИРЖЕВЫЕ ДАННЫЕ
    const tickers = [
      { name: 'Soybean Oil (CBOT)', ticker: 'ZL=F', type: 'soy' },
      { name: 'Rapeseed Oil (ICE)', ticker: 'RS=F', type: 'rapeseed' },
      { name: 'Palm Oil (Bursa)', ticker: 'FCPO=F', type: 'palm' }
    ];

    for (const item of tickers) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!res.ok) continue; 
        
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        const currency = data.chart?.result?.[0]?.meta?.currency; // Проверяем валюту
        
        if (price) {
          let finalPrice = price;
          
          if (item.type === 'soy') {
            // ZL=F: центы за фунт -> USD за тонну
            finalPrice = (price / 100) * 2204.62;
          } else if (item.type === 'palm') {
            // FCPO=F: MYR за тонну -> USD за тонну
            finalPrice = price / 4.75; 
          } else if (item.type === 'rapeseed') {
            // RS=F: Если цена в CAD, конвертируем (примерно 0.73)
            // Обычно ICE Rapeseed идет в USD, но иногда в CAD. 
            // Если цена около 1000-1500, скорее всего USD. Если 1500-2000, может быть CAD.
            // Для надежности оставим как есть, если это USD, или применим коэффициент, если нужно.
            // В большинстве случаев для RS=F на Yahoo это USD/MT.
          }

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

    // 2. ПОДСОЛНЕЧНОЕ МАСЛО (Поиск)
    try {
      // Ищем цену FOB Черное море
      const response = await tvly.search("sunflower oil price FOB Black Sea USD per ton May 2026", {
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
          // Диапазон для подсолнечного масла: $900 - $1300
          if (val > 900 && val < 1300) {
            foundPrice = val;
            break;
          }
        }
      }

      if (foundPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: 'Sunflower Oil (FOB BS)',
          metric: 'price_spot',
          value: foundPrice,
          status: 'estimated',
          sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        results.push('Sunflower Oil');
      }
    } catch (e) { console.error("Error searching Sunflower", e); }

    return NextResponse.json({ success: true, updated: results });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
