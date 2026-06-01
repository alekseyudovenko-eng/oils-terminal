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

  // Список из 9 требуемых позиций с точными запросами и диапазонами цен (USD/MT)
  const oils = [
    {
      id: 'fcpo_usd',
      name: 'Palm Oil (FCPO USD)',
      query: 'FCPO palm oil futures price USD per metric ton today Bursa Malaysia',
      min: 800, max: 1500
    },
    {
      id: 'cpo_malaysia',
      name: 'CPO Spot (Malaysia)',
      query: 'Crude Palm Oil CPO spot price Malaysia USD per tonne today MPOC',
      min: 800, max: 1500
    },
    {
      id: 'cpo_indonesia',
      name: 'CPO Spot (Indonesia)',
      query: 'Crude Palm Oil CPO spot price Indonesia USD per tonne today GAPKI',
      min: 800, max: 1500
    },
    {
      id: 'rbd_olein',
      name: 'RBD Palm Olein FOB Malaysia',
      query: 'RBD Palm Olein FOB Malaysia price USD per tonne today',
      min: 850, max: 1600
    },
    {
      id: 'soy_cbot',
      name: 'Soybean Oil CBOT (Chicago)',
      query: 'Soybean Oil futures price USD per metric ton CBOT Chicago today',
      min: 1000, max: 2500
    },
    {
      id: 'rapeseed_rotterdam',
      name: 'Rapeseed Oil FOB Rotterdam',
      query: 'Rapeseed Oil FOB Rotterdam price USD per tonne today',
      min: 1000, max: 2000
    },
    {
      id: 'sunflower_bs',
      name: 'Sunflower Oil FOB Black Sea',
      query: 'Sunflower Oil FOB Black Sea price USD per tonne today',
      min: 800, max: 1800
    },
    {
      id: 'olive_evo',
      name: 'Olive Oil Extra Virgin (EU)',
      query: 'Extra Virgin Olive Oil bulk price ex-works Europe USD per tonne 2026',
      min: 4000, max: 8000
    },
    {
      id: 'olive_virgin',
      name: 'Olive Oil Virgin (EU)',
      query: 'Virgin Olive Oil (not extra) bulk price Europe USD per tonne 2026',
      min: 3000, max: 6000
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
