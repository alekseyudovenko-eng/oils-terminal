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

  // 1. БИРЖЕВЫЕ ДАННЫЕ (Yahoo Finance - самые точные для фьючерсов)
  const futures = [
    { name: 'Soybean Oil CBOT (Chicago)', ticker: 'ZL=F', type: 'soy' },
    { name: 'Rapeseed Oil FOB Rotterdam', ticker: 'RS=F', type: 'rapeseed' },
    { name: 'Palm Oil Futures (FCPO)', ticker: 'FCPO=F', type: 'palm_futures' }
  ];

  for (const item of futures) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!res.ok) continue; 
      
      const data = await res.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      
      if (price) {
        let finalPrice = price;
        
        if (item.type === 'soy') {
          finalPrice = (price / 100) * 2204.62; // Центы/фунт -> USD/тонна
        } else if (item.type === 'palm_futures') {
          finalPrice = price / 4.75; // MYR -> USD
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

  // 2. СПОТОВЫЕ ЦЕНЫ ИЗ AGROPOST (Ищем только в свежих отчетах)
  // Мы используем запрос, который ищет "Palm Oil Prices at Closing" на сайте agropost
  const spotOils = [
    { 
      name: 'RBD Palm Olein FOB Malaysia', 
      query: 'site:agropost.wordpress.com "RBD Palm Olein" price USD tonne "May 2026" OR "29 May 2026"', 
      min: 850, max: 1600 
    },
    { 
      name: 'CPO Spot (Malaysia)', 
      query: 'site:agropost.wordpress.com "Crude Palm Oil" CPO price USD tonne "May 2026" OR "29 May 2026"', 
      min: 800, max: 1500 
    },
    { 
      name: 'Sunflower Oil (FOB BS)', 
      query: 'site:agropost.wordpress.com "Sunflower Oil" FOB Black Sea price USD tonne "May 2026"', 
      min: 800, max: 1800 
    },
    { 
      name: 'Olive Oil Extra Virgin (EU)', 
      query: 'site:agropost.wordpress.com "Olive Oil" Extra Virgin price USD tonne Europe 2026', 
      min: 3000, max: 8000 
    }
  ];

  for (const oil of spotOils) {
    try {
      const response = await tvly.search(oil.query, { 
        searchDepth: "advanced", 
        maxResults: 1, // Берем только самый релевантный (свежий) результат
        includeAnswer: true,
        includeRawContent: true
      });

      // Ищем цену в ответе
      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      let foundPrice = 0;
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val >= oil.min && val <= oil.max) {
            foundPrice = val;
            break;
          }
        }
      }

      if (foundPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: oil.name,
          metric: 'price_spot',
          value: foundPrice,
          status: 'verified',
          sources: [{ source: 'agropost_latest', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        
        results.push(oil.name);
      } else {
        console.log(`Price not found for ${oil.name} in Agropost`);
      }
    } catch (error) {
      console.error(`Error fetching ${oil.name}:`, error);
    }
  }

  return NextResponse.json({ success: true, updated: results });
}
