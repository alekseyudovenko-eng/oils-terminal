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

  // 1. БИРЖЕВЫЕ ДАННЫЕ (Yahoo Finance)
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
      
      if (!res.ok) {
        console.error(`Yahoo failed for ${item.ticker}: ${res.status}`);
        continue; 
      }
      
      const data = await res.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      const currency = data.chart?.result?.[0]?.meta?.currency;
      
      if (price) {
        let finalPrice = price;
        
        if (item.type === 'soy') {
          // ZL=F: центы за фунт -> USD за тонну
          finalPrice = (price / 100) * 2204.62;
        } else if (item.type === 'palm_futures') {
          // FCPO=F: MYR за тонну -> USD за тонну
          finalPrice = price / 4.75; 
        } else if (item.type === 'rapeseed') {
          // RS=F: Если цена в CAD, конвертируем (примерно 0.73)
          // Но чаще всего на ICE это USD. Проверим валюту.
          if (currency === 'CAD') {
            finalPrice = price * 0.73; 
          }
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

  // 2. СПОТОВЫЕ ЦЕНЫ (Поиск через Tavily)
  // Используем более широкие запросы, чтобы найти ХОТЬ ЧТО-ТО
  const spotOils = [
    { 
      name: 'RBD Palm Olein FOB Malaysia', 
      query: 'RBD Palm Olein price Malaysia USD per tonne May 2026 MPOC', 
      min: 800, max: 1700 
    },
    { 
      name: 'CPO Spot (Malaysia)', 
      query: 'Crude Palm Oil CPO price Malaysia USD per tonne May 2026', 
      min: 750, max: 1600 
    },
    { 
      name: 'CPO Spot (Indonesia)', 
      query: 'Crude Palm Oil CPO price Indonesia USD per tonne May 2026', 
      min: 750, max: 1600 
    },
    { 
      name: 'Sunflower Oil (FOB BS)', 
      query: 'Sunflower Oil FOB Black Sea price USD per tonne May 2026', 
      min: 800, max: 1900 
    },
    { 
      name: 'Olive Oil Extra Virgin (EU)', 
      query: 'Extra Virgin Olive Oil price Europe USD per tonne 2026', 
      min: 3000, max: 9000 
    },
    { 
      name: 'Olive Oil Virgin (EU)', 
      query: 'Virgin Olive Oil price Europe USD per tonne 2026', 
      min: 2500, max: 8000 
    }
  ];

  for (const oil of spotOils) {
    try {
      const response = await tvly.search(oil.query, { 
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
          // Расширенный диапазон
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
          sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        
        results.push(oil.name);
      } else {
        console.log(`No valid price found for ${oil.name}`);
      }
    } catch (error) {
      console.error(`Error fetching ${oil.name}:`, error);
    }
  }

  return NextResponse.json({ success: true, updated: results });
}
