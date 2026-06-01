import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

// Функция отправки в Telegram
async function sendTelegramNotification(prices: any[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  // Формируем красивое сообщение
  let message = "🛢️ <b>Oils Terminal Update</b>\n\n";
  
  // Берем только ключевые масла для отчета
  const keyOils = ['Palm Oil', 'Soybean Oil', 'Rapeseed Oil', 'Sunflower Oil'];
  
  prices.forEach(item => {
    // Простая проверка, чтобы не спамить лишним
    if (keyOils.some(k => item.commodity.includes(k))) {
      message += `🔹 <b>${item.commodity}</b>: $${item.value}\n`;
    }
  });

  message += `\n📅 ${new Date().toLocaleDateString('ru-RU')}`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error("Telegram Error:", e);
  }
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const results = [];

  const oils = [
    { id: 'rapeseed_rotterdam', name: 'Rapeseed Oil FOB Rotterdam', query: 'Rapeseed Oil FOB Rotterdam price USD per tonne today', min: 1000, max: 2000 },
    { id: 'soy_cbot', name: 'Soybean Oil CBOT (Chicago)', query: 'Soybean Oil futures price USD per metric ton CBOT Chicago today', min: 1000, max: 2500 },
    { id: 'rbd_olein', name: 'RBD Palm Olein FOB Malaysia', query: 'RBD Palm Olein FOB Malaysia price USD per tonne today MPOC', min: 850, max: 1600 },
    { id: 'cpo_indonesia', name: 'CPO Spot (Indonesia)', query: 'Crude Palm Oil CPO spot price Indonesia USD per tonne today GAPKI', min: 800, max: 1500 },
    { id: 'cpo_malaysia', name: 'CPO Spot (Malaysia)', query: 'Crude Palm Oil CPO spot price Malaysia USD per tonne today MPOC', min: 800, max: 1500 },
    { id: 'sunflower_bs', name: 'Sunflower Oil (FOB BS)', query: 'Sunflower Oil FOB Black Sea price USD per tonne today', min: 800, max: 1800 },
    { id: 'olive_eu', name: 'Olive Oil (Europe)', query: 'Olive Oil bulk price ex-works Europe USD per tonne 2026 Extra Virgin or Virgin', min: 3000, max: 8000 }
  ];

  for (const oil of oils) {
    try {
      const response = await tvly.search(oil.query, { searchDepth: "advanced", maxResults: 3, includeAnswer: true });
      const text = (response.answer || "") + " " + JSON.stringify(response.results);
      const matches = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
      
      let foundPrice = 0;
      if (matches) {
        for (const m of matches) {
          const val = parseFloat(m.replace(/,/g, ''));
          if (val >= oil.min && val <= oil.max) {
            foundPrice = val;
            break;
          }
        }
      }

      if (foundPrice > 0) {
        await supabase.from('market_data').upsert({
          commodity: oil.name,
          metric: 'price_spot',
          value: foundPrice,
          status: 'verified',
          sources: [{ source: 'tavily_search', url: response.results?.[0]?.url }],
          verified_at: new Date().toISOString()
        }, { onConflict: 'commodity' });
        
        results.push({ commodity: oil.name, value: foundPrice });
      }
    } catch (error) {
      console.error(`Error fetching ${oil.name}:`, error);
    }
  }

  // Отправляем уведомление в Telegram после обновления
  await sendTelegramNotification(results);

  return NextResponse.json({ success: true, updated: results });
}
