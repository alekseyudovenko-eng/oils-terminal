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
    // 1. Ищем страницу с ценой на Trading Economics
    const searchRes = await tvly.search("soybean oil price trading economics", {
      searchDepth: "basic",
      maxResults: 1
    });

    const targetUrl = searchRes.results?.[0]?.url;
    
    if (!targetUrl) {
      throw new Error("Source URL not found");
    }

    // 2. Вытаскиваем текст со страницы
    const extractRes = await tvly.extract([targetUrl]);
    const rawText = JSON.stringify(extractRes.results);

    // 3. Ищем цену. Регулярка ищет числа вида 1,650.94 или 1650.94
    const matches = rawText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
    
    let price = 0;
    if (matches) {
      for (const m of matches) {
        const val = parseFloat(m.replace(/,/g, ''));
        // Фильтр: цена за тонну обычно между 1000 и 3000 долларов
        if (val > 1000 && val < 3000) {
          price = val;
          break;
        }
      }
    }

    // 4. ЕСЛИ ЦЕНА НЕ НАЙДЕНА — ВОЗВРАЩАЕМ ОШИБКУ И НИЧЕГО НЕ ПИШЕМ В БАЗУ
    if (price === 0) {
      return NextResponse.json({ 
        error: 'REAL PRICE NOT FOUND', 
        url: targetUrl,
        snippet: rawText.substring(0, 500) 
      }, { status: 500 });
    }

    // 5. Записываем в базу ТОЛЬКО если цена реальная
    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (Real)',
      metric: 'price_spot',
      value: price,
      status: 'verified',
      sources: [{ source: 'trading_economics', url: targetUrl }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: price, source: targetUrl });

  } catch (error) {
    return NextResponse.json({ error: 'CRITICAL ERROR' }, { status: 500 });
  }
}
