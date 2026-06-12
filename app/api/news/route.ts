import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

// Парсер RSS
function extractNewsFromRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = content.match(/<link>(.*?)<\/link>/);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        url: linkMatch[1].trim(),
        content: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : "",
        published_date: new Date().toISOString(),
        source: sourceName
      });
    }
  }
  return items;
}

// Запрос к Google Custom Search
async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !cx) return [];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&dateRestrict=d1&searchType=news&num=10`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((item: any) => ({
      title: item.title.replace(/<[^>]*>/g, ''), // Чистим HTML из заголовка
      url: item.link,
      content: item.snippet ? item.snippet.substring(0, 200) : "",
      published_date: new Date().toISOString(),
      source: 'Google Custom Search',
      image: item.pagemap?.cse_image?.[0]?.src || undefined
    }));
  } catch (e) {
    console.error("Google Search Error:", e);
    return [];
  }
}

export async function GET() {
  let allNews: NewsItem[] = [];

  // 1. Google Search
  const googleQueries = ['palm oil price Indonesia', 'crude palm oil market news', 'soybean oil CBOT price', 'sunflower oil export'];
  for (const query of googleQueries) {
    const items = await fetchGoogleNews(query);
    allNews = [...allNews, ...items];
    if (allNews.length >= 15) break;
  }

  // 2. Fallback RSS
  if (allNews.length < 10) {
    const rssSources = [
      { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' },
      { url: 'https://www.apk-inform.com/ru/news/rss', name: 'APK-Inform' },
      { url: 'https://mpoc.org.my/feed/', name: 'MPOC' }
    ];
    for (const src of rssSources) {
      try {
        const res = await fetch(src.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } });
        if (res.ok) {
          const text = await res.text();
          allNews = [...allNews, ...extractNewsFromRSS(text, src.name)];
        }
      } catch (e) { continue; }
    }
  }

  // 3. Дедубликация
  const seen = new Set<string>();
  const uniqueNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ news: uniqueNews.slice(0, 25) });
}
