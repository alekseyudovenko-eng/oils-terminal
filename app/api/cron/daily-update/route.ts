import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const updatedPrices: { name: string; value: number }[] = [];

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
      
      if (!res.ok) continue; 
      
      const data = await res.json();
      const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
      
      if (price) {
        let finalPrice = price;
        if (item.type === 'soy') finalPrice = (price / 100) * 2204.62;
        else if (item.type === 'palm_futures') finalPrice = price / 4.75;
        
        await supabase.from('market_data').upsert({
          commodity: item.name,
          metric: 'price_spot',
          value: parseFloat(finalPrice.toFixed(2)),
          status: 'verified',
          sources: [{ source: 'yahoo_finance' }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        
        updatedPrices.push({ name: item.name, value: parseFloat(finalPrice.toFixed(2)) });
      }
    } catch (e) { console.error(e); }
  }

  // 2. СПОТОВЫЕ ЦЕНЫ + ИНДОНЕЗИЙСКАЯ HPE
  const spotOils = [
    { 
      name: 'RBD Palm Olein FOB Malaysia', 
      query: 'RBD Palm Olein FOB Malaysia price USD tonne MPOC June 2026', 
      min: 900, max: 1100 
    },
    { 
      name: 'CPO Spot (Malaysia)', 
      query: 'Crude Palm Oil CPO spot price Malaysia USD tonne MPOC June 2026', 
      min: 850, max: 1000 
    },
    { 
      name: 'CPO Reference Price (Indonesia)', // Новая позиция
      query: 'Indonesia CPO HPE reference price USD tonne June 2026 ministry of trade', 
      min: 800, max: 1000 
    },
    { 
      name: 'Sunflower Oil (FOB BS)', 
      query: 'Sunflower Oil FOB Black Sea price USD tonne June 2026', 
      min: 1100, max: 1300 
    }
    // Olive Oil удален
  ];

  for (const oil of spotOils) {
    let foundPrice = 0;
    try {
      const response = await tvly.search(oil.query, { searchDepth: "advanced", maxResults: 2, includeAnswer: true });
      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val >= oil.min && val <= oil.max) {
            foundPrice = val;
            break;
          }
        }
      }
    } catch (error) { console.error(error); }

    if (foundPrice > 0) {
      await supabase.from('market_data').upsert({
        commodity: oil.name,
        metric: 'price_spot',
        value: foundPrice,
        status: 'verified',
        sources: [{ source: 'tavily_search' }],
        verified_at: new Date().toISOString()
      }, { onConflict: 'commodity' });
      updatedPrices.push({ name: oil.name, value: foundPrice });
    }
  }

  // 3. TELEGRAM (Без оливы)
  await sendTelegramReport(updatedPrices);

  return NextResponse.json({ success: true, updated: updatedPrices.length });
}

async function sendTelegramReport(prices: { name: string; value: number }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  let msg = "🛢️ <b>Oils Terminal Daily Report</b>\n";
  msg += `📅 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
  
  const labels: string[] = [];
  const data: number[] = [];

  prices.forEach(p => {
    // Пропускаем оливковое масло, если оно вдруг попало
    if (p.name.includes('Olive')) return;

    msg += `🔹 <b>${p.name}</b>: $${p.value}\n`;
    labels.push(p.name.split('(')[0].trim().substring(0, 10));
    data.push(p.value);
  });

  if (data.length === 0) return;

  const chartUrl = `https://quickchart.io/chart?c={type:'bar',data:{labels:['${labels.join("','")}'],datasets:[{label:'USD/MT',data:[${data.join(',')}],backgroundColor:'rgba(54, 162, 235, 0.6)'}]}}&w=600&h=400`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: chartUrl, caption: msg, parse_mode: 'HTML' })
    });
  } catch (e) { console.error(e); }
}
