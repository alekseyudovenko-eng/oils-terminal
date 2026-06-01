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

  // Список масел с точными запросами и диапазонами цен
  const oils = [
    {
      id: 'soybean',
      name: 'Soybean Oil (CBOT)',
      query: 'soybean oil futures price USD per metric ton CBOT today',
      min: 1000, max: 2500
    },
    {
      id: 'palm_futures',
      name: 'Palm Oil (FCPO USD)', // Конвертированная цена фьючерса
      query: 'palm oil FCPO futures price USD per metric ton today',
      min: 800, max: 1500
    },
    {
      id: 'palm_spot',
      name: 'CPO Spot (Malaysia/Indonesia)', // Физический рынок
      query: 'crude palm oil CPO spot price Malaysia Indonesia USD per tonne today',
      min: 800, max: 1500
    },
    {
      id: 'rapeseed',
      name: 'Rapeseed Oil (ICE)',
      query: 'rapeseed oil futures price USD per metric ton ICE London today',
      min: 1000, max: 2000
    },
    {
      id: 'sunflower',
      name: 'Sunflower Oil (FOB BS)',
      query: 'sunflower oil export price FOB Black Sea USD per tonne recent',
      min: 800, max: 1800
    },
    {
      id: 'olive_evo',
      name: 'Olive Oil Extra Virgin (EU)', // Только Extra Virgin
      query: 'extra virgin olive oil bulk price ex-works Europe USD per tonne 2026 site:tradingeconomics.com OR site:investing.com OR site:fastmarkets.com',
      min: 4000, max: 7500 // Диапазон для EVOO
    }
  ];

  for (const oil of oils) {
    try {
      // 1. Поиск через Tavily
      const response = await tvly.search(oil.query, {
        searchDepth: "advanced",
        maxResults: 3,
        includeAnswer: true
      });

      // 2. Анализ текста
      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      
      // Ищем числа с плавающей точкой
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      let foundPrice = 0;
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          // Проверяем диапазон
          if (val >= oil.min && val <= oil.max) {
            foundPrice = val;
            break;
          }
        }
      }

      // 3. Если нашли цену — сохраняем
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
        console.log(`Price not found for ${oil.name}`);
      }

    } catch (error) {
      console.error(`Error fetching ${oil.name}:`, error);
    }
  }

  return NextResponse.json({ success: true, updated: results });
}
