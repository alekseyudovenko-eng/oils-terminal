import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NewsItem {
  title: string;
  url: string;
}

async function fetchGoogleNewsItems(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) return [];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=news&num=10`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ? data.items.map((i: any) => ({ 
      title: i.title?.replace(/<[^>]*>/g, '') || 'No title', 
      url: i.link 
    })) : [];
  } catch { 
    return []; 
  }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });
  }

  let allNews: NewsItem[] = [];
  const queries = ['palm oil market', 'soybean oil price', 'vegetable oil news'];

  for (const q of queries) {
    const items = await fetchGoogleNewsItems(q);
    allNews = [...allNews, ...items];
    if (allNews.length >= 5) break;
  }

  // Дедубликация
  const seen = new Set<string>();
  const finalNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  if (finalNews.length === 0) {
    return new NextResponse(JSON.stringify({ 
      error: "GOOGLE SEARCH RETURNED EMPTY",
      debug: { queriesAttempted: queries.length }
    }), { status: 500 });
  }

  let msg = `📰 <b>Google News Digest</b>\n🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
  finalNews.forEach((n, i) => {
    msg += `<b>${i+1}. ${n.title}</b>\n<a href="${n.url}">Link</a>\n\n`;
  });

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: msg, 
      parse_mode: 'HTML' 
    })
  });

  return new NextResponse(JSON.stringify({ 
    success: true, 
    count: finalNews.length,
    source: 'Google Custom Search ONLY'
  }));
}
