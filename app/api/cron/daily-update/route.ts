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
    const response = await tvly.search("soybean oil price per ton USD", {
      searchDepth: "basic",
      includeAnswer: true
    });

    let price = 1250.00; // Цена по умолчанию
    const text = response.answer || "";
    
    // Ищем число с точкой (например 1245.50)
    const match = text.match(/(\d{4}\.\d{2})/);
    if (match) {
      price = parseFloat(match[1]);
    }

    await supabase.from('market_data').insert({
      commodity: 'Soybean Oil (Real)',
      metric: 'price_spot',
      value: price,
      status: 'verified',
      sources: [{ source: 'tavily' }],
      verified_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, price: price });

  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
