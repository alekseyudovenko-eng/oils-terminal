import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Список источников для мониторинга
const SOURCES = [
  { name: 'APK-Inform', url: 'https://www.apk-inform.com/ru/news/rss' },
  { name: 'MPOC (Malaysia)', url: 'https://mpoc.org.my/feed/' },
  { name: 'Google News (Palm Oil)', url: 'https://news.google.com/rss/search?q=palm+oil+market&hl=en-US&gl=US&ceid=US:en' },
  { name: 'World Grain', url: 'https://www.world-grain.com/rss/feed' }
];

export async function GET() {
  let allNews: NewsItem[] = [];
  const seenTitles = new Set<string>();

  // Параллельный сбор данных со всех источников
  const promises = SOURCES.map(async (source) => {
    try {
      const res = await fetch(source.url, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      
      const text = await res.text();
      const feed = await parser.parseString(text);
      
      return (feed.items || []).map((item: any) => ({
        title: item.title?.trim() || "",
        url: item.link || "#",
        content: item.contentSnippet || item.summary || "",
        published_date: item.pubDate || new Date().toISOString(),
        source: source.name
      }));
    } catch (e) {
      console.error(`Error fetching ${source.name}:`, e);
      return [];
    }
  });

  const results = await Promise.all(promises);

  // Объединяем, чистим и фильтруем
  results.flat().forEach(item => {
    // Пропускаем новости без заголовка или слишком короткие
    if (!item.title || item.title.length < 10) return;

    // Простая защита от дубликатов по заголовку (в нижнем регистре)
    const titleKey = item.title.toLowerCase();
    if (seenTitles.has(titleKey)) return;
    
    seenTitles.add(titleKey);
    allNews.push(item);
  });

  // Сортируем по дате (самые свежие первыми)
  allNews.sort((a, b) => 
    new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  );

  return NextResponse.json({ news: allNews.slice(0, 25) });
}
