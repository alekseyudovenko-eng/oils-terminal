import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Простая функция для извлечения данных из XML без внешних библиотек
function parseRSS(xml: string) {
  const items = [];
  const regex = /<item>(.*?)<\/item>/gs;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);

    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].replace(/&amp;/g, '&'),
        link: linkMatch[1],
        desc: descMatch ? descMatch[1].replace(/&amp;/g, '&') : ''
      });
    }
  }
  return items;
}

export async function GET() {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: "Config missing" }, { status: 500 });
  }

  try {
    // 1. Забираем RSS
    const res = await fetch('https://www.apk-inform.com/ru/news/rss', {
      headers: { 'User-Agent': 'OilsTerminalBot/1.0' },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`APK Status: ${res.status}`);
    
    const xmlText = await res.text();
    const news = parseRSS(xmlText).slice(0, 5); // Топ-5 новостей

    if (news.length === 0) throw new Error("No news found in RSS");

    // 2. Формируем красивое сообщение
    let msg = "📰 <b>Morning News Digest</b>\n";
    msg += `🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;

    news.forEach((n, i) => {
      // Если описание есть и не слишком длинное, добавляем его
      const snippet = n.desc && n.desc !== "Новость от АПК-Информ" 
        ? `\n   _${n.desc.substring(0, 120)}..._` 
        : "";
      
      msg += `<b>${i+1}. ${n.title}</b>${snippet}\n🔗 <a href="${n.link}">Читать</a>\n\n`;
    });

    msg += `<i>Source: Oils Terminal Aggregator</i>`;

    // 3. Отправляем в Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: msg, 
        parse_mode: 'HTML', 
        disable_web_page_preview: false 
      })
    });

    if (!tgRes.ok) throw new Error("Telegram API Error");

    return NextResponse.json({ success: true, sent: news.length });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
