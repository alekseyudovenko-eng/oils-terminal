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

// ТВОИ ДАННЫЕ ИЗ XML (Как гарантированный источник)
const HARDCODED_NEWS = [
  {
    title: "Russian sunflower oil exports to India increased by more than 70% in 2026",
    url: "https://www.apk-inform.com/en/news/1554774",
    content: "Russian sunflower oil exports to India increased by more than 70% in 2026",
    published_date: "2026-06-03T17:48:08.000Z",
    source: "APK-Inform"
  },
  {
    title: "Kazakhstan oilseed processing sector posts record results – FOC 2026",
    url: "https://www.apk-inform.com/en/news/1554777",
    content: "Kazakhstan oilseed processing sector posts record results – to be discussed at FOC 2026: Fats and Oils Conference",
    published_date: "2026-06-03T17:48:08.000Z",
    source: "APK-Inform"
  },
  {
    title: "Ukrzaliznytsia cuts rail exports of oilseed processing products",
    url: "https://www.apk-inform.com/en/news/1554766",
    content: "Ukrzaliznytsia cuts rail exports of oilseed processing products",
    published_date: "2026-06-03T17:48:08.000Z",
    source: "APK-Inform"
  },
  {
    title: "Russian grain exports rose 1.6-fold in May– RGU",
    url: "https://www.apk-inform.com/en/news/1554786",
    content: "Russian grain exports rose 1.6-fold in May– RGU",
    published_date: "2026-06-03T17:48:08.000Z",
    source: "APK-Inform"
  },
  {
    title: "Ukraine’s agri export road shipments remained steady in May",
    url: "https://www.apk-inform.com/en/news/1554778",
    content: "Ukraine’s agri export road shipments remained steady in May",
    published_date: "2026-06-03T17:48:08.000Z",
    source: "APK-Inform"
  }
];

export async function GET() {
  let liveNews: NewsItem[] = [];
  
  // Пробуем получить живые данные
  try {
    // Используем прямой URL на английскую ленту новостей
    const feed = await parser.parseURL('https://www.apk-inform.com/en/news/rss');
    
    if (feed && feed.items) {
      liveNews = feed.items.map((item: any) => ({
        title: item.title,
        url: item.link,
        content: item.contentSnippet || "",
        published_date: new Date(item.pubDate || Date.now()).toISOString(),
        source: "APK-Inform (Live)"
      })).filter(item => !item.title.toLowerCase().includes('subscription') && !item.title.toLowerCase().includes('advertising'));
    }
  } catch (e) {
    console.log("Live RSS failed, using hardcoded backup");
  }

  // Если живых данных нет или мало, добавляем твои проверенные новости
  const finalNews = liveNews.length > 0 ? liveNews : HARDCODED_NEWS;

  return NextResponse.json({ news: finalNews });
}
