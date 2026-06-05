import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NewsItem {
  title: string;
  url: string;
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const content = match[1];
    const t = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const l = content.match(/<link>(.*?)<\/link>/);
    if (t && l) items.push({ title: t[1].trim(), url: l[1].trim() });
  }
  return items;
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });

  const sources = [
    'https://www.palmoilmagazine.com/feed/', // НОВЫЙ ИСТОЧНИК
    'https://www.apk-inform.com/ru/news/rss',
    'https://mpoc.org.my/feed/'
  ];

  let allNews: NewsItem[] = [];
  
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      });
      if (res.ok) {
        const text = await res.text();
        allNews = [...allNews, ...parseRSS(text)];
        if (allNews.length >= 10) break; 
      }
    } catch (e) { continue; }
  }

  // Убираем дубликаты и берем топ-5
  const seen = new Set<string>();
  const uniqueNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  if (uniqueNews.length === 0) {
    return new NextResponse(JSON.stringify({ error: "NO NEWS PARSED" }), { status: 500 });
  }

  let msg = `📰 <b>Сводка Oils Terminal</b>\n🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
  uniqueNews.forEach((n, i) => {
    msg += `<b>${i+1}. ${n.title.replace(/&amp;/g, '&')}</b>\n<a href="${n.url}">Link</a>\n\n`;
  });

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
  });

  return new NextResponse(JSON.stringify({ success: true, count: uniqueNews.length }));
}
