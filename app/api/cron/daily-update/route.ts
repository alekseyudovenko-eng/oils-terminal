import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

  try {
    // 1. Получаем сегодняшнюю дату для фильтра
    const today = new Date();
    // Формат для поиска: YYYY-MM-DD (Tavily понимает этот формат)
    const dateString = today.toISOString().split('T')[0];
    
    // 2. Запрос с фильтром по дате (после начала текущей недели)
    // Мы ищем конкретные фьючерсы ZL (Soybean Oil)
    const query = `soybean oil futures price per metric ton USD after:${dateString} site:investing.com OR site:barchart.com OR site:tradingeconomics.com`;

    const response = await tvly.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      includeAnswer: true,
      topic: "finance"
    });

    let price = 0;
    let sourceUrl = "";
    
    // 3. Анализируем ответ
    // Сначала пытаемся взять из "Answer" (самый релевантный snippet)
    const textToCheck = (response.answer || "") + " " + JSON.stringify(response.results);
    
    // Ищем числа в диапазоне 1000-2500 (реалистично для тонны масла)
    const matches = textToCheck.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
    
    if (matches) {
      for (const m of matches) {
        const val = parseFloat(m.replace(/,/g, ''));
        if (val > 1000 && val < 2500) {
          price = val;
          break;
        }
      }
    }

    // 4. Если не нашли, пробуем более широкий поиск без strict date, но с требованием "today"
    if (price === 0) {
      const fallbackRes = await tvly.search("soybean oil futures price today USD per ton", {
        searchDepth: "basic",
        maxResults: 3
      });
      
      const fallbackText = (fallbackRes.answer || "") + " " + JSON.stringify(fallbackRes.results);
      const fallbackMatches = fallbackText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      if (fallbackMatches) {
        for (const m of fallbackMatches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val > 1000 && val < 2500) {
            price = val;
            sourceUrl = "Fallback Search";
            break;
          }
        }
      }
    }

    // 5. Если цена не найдена — ОШИБКА
    if (price === 0) {
      return NextResponse.json({ 
        error: 'NO RECENT PRICE FOUND', 
        query_used: query,
        snippet: response.answer 
      }, { status: 500 });
    }

    // 6. Сохраняем
    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (CBOT)',
      metric: 'price_spot',
      value: price,
      status: 'verified',
      sources: [{ source: 'recent_finance_search', url: sourceUrl || 'aggregated' }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: price });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
