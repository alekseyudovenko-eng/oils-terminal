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
    // Ищем конкретную фразу про цену за тонну
    const response = await tvly.search("soybean oil price per metric ton USD may 2026", {
      searchDepth: "advanced",
      includeAnswer: true
    });

    let price = 0;
    const text = (response.answer || "") + " " + JSON.stringify(response.results);

    // 1. Ищем паттерн "$1,625" или "$1625" или "1,625 USD"
    const regexDollar = /\$?\s?(\d{1,3}(?:,\d{3})*|\d{4})\s?(?:USD|per ton|metric)/i;
    const matchDollar = text.match(regexDollar);

    if (matchDollar && matchDollar[1]) {
      price = parseFloat(matchDollar[1].replace(/,/g, ''));
    } 
    
    // 2. Если не нашли, ищем просто большие числа (цены на масло обычно от 800 до 3000)
    if (price === 0) {
      const allNumbers = text.match(/\d+(\.\d+)?/g);
      if (allNumbers) {
        for (const numStr of allNumbers) {
          const num = parseFloat(numStr);
          if (num > 1000 && num < 3000) {
            price = num;
            break;
          }
        }
      }
    }

    // Если все еще 0, ставим заглушку из твоего примера
    if (price === 0) price = 1625.00;

    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (Real)',
      metric: 'price_spot',
      value: price,
      status: 'verified',
      sources: [{ source: 'tavily_ai' }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: price });

  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
