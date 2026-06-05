import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Функция парсинга (универсальная)
function extractNews(xml: string) {
  const items = [];
  // Ищем все блоки <item>...</item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    // Заголовок
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    // Ссылка
    const linkMatch = content.match(/<link>(.*?)<\/link>/);
    
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        link: linkMatch[1].trim()
      });
    }
  }
  return items;
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });

  // Список источников. Пробуем по очереди.
  const sources = [
    'https://www.apk-inform.com/ru/news/rss',
    'https://news.google.com/rss/search?q=palm+oil&hl=en-US&gl=US&ceid=US:en',
    'https://mpoc.org.my/feed/'
  ];

  let allNews = [];
  let usedSource = "";

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        cache: 'no-store'
      });

      if (res.ok) {
        const text = await res.text();
        const items = extractNews(text);
        
        if (items.length > 0) {
          allNews = items.slice(0, 5);
          usedSource = url.includes('google') ? 'Google News' : (url.includes('apk') ? 'APK-Inform' : 'MPOC');
          break; // Нашли новости, выходим из цикла
        }
      }
    } catch (e) {
      continue; // Ошибка сети, пробуем следующий
    }
  }

  if (allNews.length === 0) {
    return new NextResponse(JSON.stringify({ error: "ALL SOURCES EMPTY OR FAILED" }), { status: 500 });
  }

  // Формируем сообщение
  let msg = `📰 <b>News Digest (${usedSource})</b>\n\n`;
  allNews.forEach((n, i) => {
    msg += `<b>${i+1}. ${n.title}</b>\n<a href="${n.link}">Link</a>\n\n`;
  });

  // Отправляем в Telegram
  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML'
    })
  });

  if (!tgRes.ok) return new NextResponse(JSON.stringify({ error: "TG SEND FAILED" }), { status: 500 });

  return new NextResponse(JSON.stringify({ success: true, count: allNews.length, source: usedSource }), {
    headers: { 'Cache-Control': 'no-store' }
  });
}
