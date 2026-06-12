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
    if (t && l) items.push({ title: t[1].trim().replace(/<[^>]*>/g, ''), url: l[1].trim() });
  }
  return items;
}

async function fetchGoogleNewsItems(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) return [];
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&dateRestrict=d1&searchType=news&num=10`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ? data.items.map((i: any) => ({ title: i.title.replace(/<[^>]*>/g, ''), url: i.link })) : [];
  } catch { return []; }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });

  let allNews: NewsItem[] = [];
  const queries = ['palm oil market news', 'soybean oil price update', 'sunflower oil export'];

  for (const q of queries) {
    const items = await fetchGoogleNewsItems(q);
    allNews = [...allNews, ...items];
    if (allNews.length >= 5) break;
  }

  // Fallback RSS если Google пуст
  if (allNews.length === 0) {
    const rssUrls = ['https://www.palmoilmagazine.com/feed/', 'https://mpoc.org.my/feed/'];
    for (const url of rssUrls) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
        if (res.ok) allNews = [...allNews, ...parseRSS(await res.text())];
        if (allNews.length >= 5) break;
      } catch { continue; }
    }
  }

  // Дедубликация и лимит 5
  const seen = new Set<string>();
  const finalNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  if (finalNews.length === 0) return new NextResponse(JSON.stringify({ error: "NO NEWS FOUND" }), { status: 500 });

  let msg = `📰 <b>Сводка Oils Terminal</b>\n🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
  finalNews.forEach((n, i) => {
    msg += `<b>${i+1}. ${n.title}</b>\n<a href="${n.url}">Читать</a>\n\n`;
  });

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
  });

  return new NextResponse(JSON.stringify({ success: true, count: finalNews.length }));
}
