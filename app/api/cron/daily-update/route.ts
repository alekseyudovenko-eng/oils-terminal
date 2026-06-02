import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

// Базовые цены из твоего отчета (Extended Weekly Update 18.5.2026)
// Используем их как fallback, если парсинг не сработал
const BASELINE_PRICES: Record<string, number> = {
  'RBD Palm Olein FOB Malaysia': 945,
  'CPO Spot (Malaysia)': 890,
  'Sunflower Oil (FOB BS)': 1165,
  'Olive Oil Extra Virgin (EU)': 6069,
  'Soybean Oil CBOT (Chicago)': 1715,
  'Rapeseed Oil FOB Rotterdam': 1265,
  'CPO Spot (Indonesia)': 880,
  'Olive Oil Virgin (EU)': 4500
};

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const updatedPrices: { name: string; value: number }[] = [];

  // 1. БИРЖЕВЫЕ ДАННЫЕ (Yahoo Finance - живые данные)
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
        
        if (item.type === 'soy') {
          finalPrice = (price / 100) * 2204.62; // Центы/фунт -> USD/тонна
        } else if (item.type === 'palm_futures') {
          finalPrice = price / 4.75; // MYR -> USD
        }
        
        await supabase.from('market_data').upsert({
          commodity: item.name,
          metric: 'price_spot',
          value: parseFloat(finalPrice.toFixed(2)),
          status: 'verified',
          sources: [{ source: 'yahoo_finance', url: `https://finance.yahoo.com/quote/${item.ticker}` }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        
        updatedPrices.push({ name: item.name, value: parseFloat(finalPrice.toFixed(2)) });
      }
    } catch (e) { console.error(`Error fetching ${item.name}`, e); }
  }

  // 2. СПОТОВЫЕ ЦЕНЫ (Поиск + Fallback на базовые цены)
  const spotOils = [
    { name: 'RBD Palm Olein FOB Malaysia', query: 'RBD Palm Olein FOB Malaysia price USD May 2026 MPOC', min: 850, max: 1600 },
    { name: 'CPO Spot (Malaysia)', query: 'Crude Palm Oil CPO spot price Malaysia USD May 2026', min: 800, max: 1500 },
    { name: 'CPO Spot (Indonesia)', query: 'Crude Palm Oil CPO spot price Indonesia USD May 2026', min: 800, max: 1500 },
    { name: 'Sunflower Oil (FOB BS)', query: 'Sunflower Oil FOB Black Sea price USD May 2026', min: 800, max: 1800 },
    { name: 'Olive Oil Extra Virgin (EU)', query: 'Extra Virgin Olive Oil price Europe USD 2026', min: 3000, max: 9000 },
    { name: 'Olive Oil Virgin (EU)', query: 'Virgin Olive Oil price Europe USD 2026', min: 2500, max: 8000 }
  ];

  for (const oil of spotOils) {
    let foundPrice = 0;
    let source = 'baseline_report';

    // Пробуем найти свежую цену
    try {
      const response = await tvly.search(oil.query, { 
        searchDepth: "advanced", 
        maxResults: 2, 
        includeAnswer: true 
      });

      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val >= oil.min && val <= oil.max) {
            foundPrice = val;
            source = 'tavily_search';
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Search error for ${oil.name}`);
    }

    // Если не нашли, берем базовую цену из отчета
    if (foundPrice === 0 && BASELINE_PRICES[oil.name]) {
      foundPrice = BASELINE_PRICES[oil.name];
    }

    if (foundPrice > 0) {
      await supabase.from('market_data').upsert({
        commodity: oil.name,
        metric: 'price_spot',
        value: foundPrice,
        status: source === 'baseline_report' ? 'estimated' : 'verified',
        sources: [{ source: source, url: 'https://agropost.wordpress.com' }],
        verified_at: new Date().toISOString()
      }, { onConflict: 'commodity' });
      
      updatedPrices.push({ name: oil.name, value: foundPrice });
    }
  }

  // 3. ОТПРАВКА В TELEGRAM (С графиком и таблицей)
  await sendTelegramReport(updatedPrices);

  return NextResponse.json({ success: true, updated: updatedPrices.length });
}

async function sendTelegramReport(prices: { name: string; value: number }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  // Формируем текст
  let msg = "🛢️ <b>Oils Terminal Daily Report</b>\n";
  msg += `📅 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
  
  // Данные для графика
  const labels: string[] = [];
  const data: number[] = [];

  prices.forEach(p => {
    msg += `🔹 <b>${p.name}</b>: $${p.value}\n`;
    labels.push(p.name.split('(')[0].trim().substring(0, 10));
    data.push(p.value);
  });

  // Генерируем график
  const chartUrl = `https://quickchart.io/chart?c={type:'bar',data:{labels:['${labels.join("','")}'],datasets:[{label:'USD/MT',data:[${data.join(',')}],backgroundColor:'rgba(54, 162, 235, 0.6)'}]}}&w=600&h=400`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: chartUrl,
        caption: msg,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error("Telegram Error:", e);
  }
}
