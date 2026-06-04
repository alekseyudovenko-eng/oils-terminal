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

// Используем русскую ленту, так как ты прислал её пример. 
// Если нужны новости на английском, замени /ru/ на /en/
const APK_RSS_URL = 'https://www.apk-inform.com/ru/news/rss';

export async function GET() {
  let allNews: NewsItem[] = [];

  try {
    const feed = await parser.parseURL(APK_RSS_URL);
    
    if (feed && feed.items) {
      feed.items.forEach((item: any) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        
        // Берем только свежие новости (за последние 14 дней)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        if (!isNaN(pubDate.getTime()) && pubDate >= twoWeeksAgo) {
          allNews.push({
            title: item.title,
            url: item.link,
            content: item.contentSnippet || item.summary || "",
            published_date: pubDate.toISOString(),
            source: "APK-Inform"
          });
        }
      });
    }
  } catch (err) {
    console.error("RSS Parse Error:", (err as Error).message);
    // Если RSS недоступен, возвращаем пустой массив или ошибку
    return NextResponse.json({ error: "Failed to load news feed" }, { status: 500 });
  }

  // Сортируем: самые свежие первыми
  allNews.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

  return NextResponse.json({ news: allNews.slice(0, 20) });
}
