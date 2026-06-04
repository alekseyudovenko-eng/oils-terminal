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

// Функция для генерации твоего собственного RSS XML
function generateCustomRSS(items: NewsItem[]) {
  const now = new Date().toUTCString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Oils Terminal News Feed</title>
    <link>https://oils-terminal.vercel.app</link>
    <description>Curated news from APK-Inform and other sources</description>
    <language>ru-ru</language>
    <lastBuildDate>${now}</lastBuildDate>
`;

  items.forEach(item => {
    xml += `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.url}</link>
      <description><![CDATA[${item.content}]]></description>
      <pubDate>${new Date(item.published_date).toUTCString()}</pubDate>
      <source>${item.source}</source>
    </item>`;
  });

  xml += `
  </channel>
</rss>`;
  return xml;
}

export async function GET() {
  // Явная типизация массива
  let rawItems: NewsItem[] = [];

  try {
    // 1. Получаем сырые данные с источника (с кэшем на 1 час)
    const res = await fetch('https://www.apk-inform.com/ru/news/rss', { 
      next: { revalidate: 3600 } 
    });
    
    if (res.ok) {
      const text = await res.text();
      const feed = await parser.parseString(text);
      
      if (feed.items) {
        rawItems = feed.items.map((item: any) => ({
          title: item.title || "No Title",
          url: item.link || "#",
          content: item.contentSnippet || "",
          published_date: item.pubDate || new Date().toISOString(),
          source: "APK-Inform"
        }));
      }
    }
  } catch (e) {
    console.error("Source fetch error:", e);
  }

  // 2. Генерируем твой собственный RSS XML
  const customRSS = generateCustomRSS(rawItems);

  // 3. Возвращаем JSON для страницы /news
  return NextResponse.json({ 
    news: rawItems.slice(0, 20),
    rss_xml: customRSS 
  });
}
