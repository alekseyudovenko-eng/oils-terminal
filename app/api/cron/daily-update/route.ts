import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

  // Список проверенных источников
  const sources = [
    "https://futures.tradingcharts.com/chart/ZL/",
    "https://www.barchart.com/futures/quotes/ZL*",
    "https://www.investing.com/commodities/soybean-oil"
  ];

  try {
    let bestPrice = 0;
    let finalSource = "";

    // Перебираем источники по очереди
    for (const url of sources) {
      try {
        // 1. Ищем контент страницы через Tavily Extract
        const extractRes = await tvly.extract([url]);
        const rawText = JSON.stringify(extractRes.results);

        // 2. Ищем цены (числа с двумя знаками после точки, например 1650.94)
        const matches = rawText.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
        
        if (matches) {
          for (const m of matches) {
            const val = parseFloat(m.replace(/,/g, ''));
            // Фильтр: цена на соевое масло обычно от 800 до 2500 долларов за тонну
            // Это отсеет цены за фунт (75 центов) и другие лишние числа
            if (val > 800 && val < 2500) {
              bestPrice = val;
              finalSource = url;
              break; // Берем первое подходящее число с этого источника
            }
          }
        }
        
        if (bestPrice > 0) break; // Если нашли цену, выходим из цикла

      } catch (e) {
        console.log(`Failed to parse ${url}`);
        continue;
      }
    }

    // 3. Если ни один источник не сработал — ошибка
    if (bestPrice === 0) {
      return NextResponse.json({ 
        error: 'NO PRICE FOUND IN TRUSTED SOURCES', 
        checked_urls: sources 
      }, { status: 500 });
    }

    // 4. Записываем в базу
    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (CBOT)',
      metric: 'price_spot',
      value: bestPrice,
      status: 'verified',
      sources: [{ source: 'trusted_aggregator', url: finalSource }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: bestPrice, source: finalSource });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
