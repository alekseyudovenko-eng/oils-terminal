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
    // 1. Ищем страницу с ценой на соевое МАСЛО (не бобы!)
    const searchRes = await tvly.search("soybean oil price trading economics", {
      searchDepth: "advanced",
      maxResults: 5
    });

    // 2. Ищем ссылку, где в адресе есть "soybean-oil"
    let targetUrl = "";
    for (const res of searchRes.results) {
      if (res.url && res.url.includes("soybean-oil")) {
        targetUrl = res.url;
        break;
      }
    }

    // Если не нашли специфичную ссылку, берем первую из поиска
    if (!targetUrl && searchRes.results?.[0]) {
      targetUrl = searchRes.results[0].url;
    }
    
    if (!targetUrl) {
      throw new Error("Source URL not found");
    }

    // 3. Вытаскиваем текст со страницы
    const extractRes = await tvly.extract([targetUrl]);
    const rawText = JSON.stringify(extractRes.results);

    // 4. Ищем цену. 
    const matches = rawText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
    
    let price = 0;
    if (matches) {
      for (const m of matches) {
        const val = parseFloat(m.replace(/,/g, ''));
        // Фильтр: цена на МАСЛО обычно выше 1400. Бобы дешевле (~1200).
        if (val > 1400 && val < 3000) {
          price = val;
          break;
        }
      }
    }

    // 5. ЕСЛИ ЦЕНА НЕ НАЙДЕНА — ОШИБКА
    if (price === 0) {
      return NextResponse.json({ 
        error: 'REAL PRICE NOT FOUND', 
        url: targetUrl,
        snippet: rawText.substring(0, 500) 
      }, { status: 500 });
    }

    // 6. Записываем в базу
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
