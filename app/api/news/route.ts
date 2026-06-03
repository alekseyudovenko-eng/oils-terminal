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

// Официальная RSS лента APK-Inform (Английская версия)
const APK_RSS_URL = 'https://www.apk-inform.com/en/news/rss';

// Слова-маркеры, которые говорят о том, что это НЕ новость, а раздел сайта
const EXCLUDED_TITLES = [
  "company news", "subscription", "advertising", "conferences", 
  "infographics", "agency news", "contacts", "about us"
];

export async function GET() {
  let allResults: NewsItem[] = [];
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 14); // Диапазон 14 дней

  try {
    const feedContent = await parser.parseURL(APK_RSS_URL);
    
    feedContent.items.forEach((item: any) => {
      const pubDate = new Date(item.pubDate || item.isoDate);
      const title = item.title || "";
      const titleLower = title.toLowerCase();

      // 1. Фильтр по дате
      if (isNaN(pubDate.getTime()) || pubDate < dateLimit) return;

      // 2. Фильтр "мусорных" заголовков (реклама, подписка и т.д.)
      if (EXCLUDED_TITLES.some(excl => titleLower.includes(excl))) return;

      // 3. (Опционально) Можно добавить фильтр по ключевым словам масел, 
      // но APK часто пишет про зерно, которое влияет на масла. 
      // Если нужно СТРОГО только масло, раскомментируй блок ниже:
      /*
      const oilKeywords = ['oil', 'palm', 'soy', 'sunflower', 'rapeseed', 'canola', 'fat', 'crushing'];
      if (!oilKeywords.some(kw => titleLower.includes(kw))) return;
      */

      allResults.push({
        title: title,
        url: item.link,
        content: item.contentSnippet || item.summary || "",
        published_date: pubDate.toISOString(),
        source: "APK-Inform"
      });
    });

  } catch (err) {
    console.error("APK-Inform RSS Error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch APK-Inform news" }, { status: 500 });
  }

  // Сортировка: самые свежие первыми
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

  return NextResponse.json({ news: allResults.slice(0, 20) });
}
