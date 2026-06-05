import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

function extractNews(xml: string, sourceName: string): NewsItem[] {
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

export async function GET() {
  let allNews: NewsItem[] = [];
  
  const sources = [
    { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' }, // НОВЫЙ ИСТОЧНИК
    { url: 'https://www.apk-inform.com/ru/news/rss', name: 'APK-Inform' },
    { url: 'https://mpoc.org.my/feed/', name: 'MPOC' },
    { url: 'https://news.google.com/rss/search?q=palm+oil+market&hl=en-US&gl=US&ceid=US:en', name: 'Google News' }
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 }
      });
      
      if (res.ok) {
        const text = await res.text();
        const items = extractNews(text, src.name);
        allNews = [...allNews, ...items];
      }
    } catch (e) { continue; }
  }

  // Убираем дубликаты
  const seen = new Set<string>();
  const uniqueNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ news: uniqueNews.slice(0, 25) });
}
