import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Функция для парсинга XML без библиотек
function parseRSS(xml: string) {
  const items = [];
  const regex = /<item>(.*?)<\/item>/gs;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].replace(/&amp;/g, '&'),
        link: linkMatch[1]
      });
    }
  }
  return items;
}

export async function GET() {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: "Config missing" }, { status: 500 });
  }

  // Источники: пробуем APK, если не выйдет — MPOC
  const sources = [
    'https://www.apk-inform.com/ru/news/rss',
    'https://mpoc.org.my/feed/'
  ];

  let news = [];
  let sourceName = "";

  for (const url of sources) {
    try {
      // Маскируемся под обычный браузер Chrome
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*',
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const xmlText = await res.text();
        const parsedItems = parseRSS(xmlText);
        if (parsedItems.length > 0) {
          news = parsedItems.slice(0, 5);
          sourceName = url.includes('apk') ? 'APK-Inform' : 'MPOC';
          break; // Успех, выходим из цикла
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ${url}:`, e);
      continue;
    }
  }

  if (news.length === 0) {
    return NextResponse.json({ error: "All sources failed or empty" }, { status: 500 });
  }

  // Формируем сообщение
  let msg = `📰 <b>Morning News Digest (${sourceName})</b>\n`;
  msg += `🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;

  news.forEach((n, i) => {
    msg += `<b>${i+1}. ${n.title}</b>\n🔗 <a href="${n.link}">Читать</a>\n\n`;
  });

  msg += `<i>Source: Oils Terminal Aggregator</i>`;

  // Отправляем в Telegram
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: msg, 
        parse_mode: 'HTML', 
        disable_web_page_preview: false 
      })
    });
    return NextResponse.json({ success: true, sent: news.length, source: sourceName });
  } catch (e) {
    return NextResponse.json({ error: "Telegram send failed" }, { status: 500 });
  }
}
