import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { tavily } from '@tavily/core';

const parser = new Parser();
// Инициализируем клиент один раз
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Список RSS лент
const RSS_FEEDS = [
  { url: 'https://www.apk-inform.com/ru/rss/maslichnye.xml', source: 'APK-Inform' },
  { url: 'https://www.producer.com/feed/', source: 'The Western Producer' },
  { url: 'https://www.world-grain.com/rss/feed', source: 'World Grain' },
  { url: 'http://www.fao.org/news/rss-news/en/', source: 'FAO' },
  { url: 'https://www.zerno-online.ru/rss/maslichnye', source: 'Zerno Online' },
];

// Список сайтов для поиска
const SCRAPE_SITES = [
  "site:mpoc.org.my",
  "site:gapki.id",
  "site:theedgemarkets.com",
  "site:noticiasagricolas.com.br",
  "site:bolsadecereales.com.ar",
  "site:sovecon.ru",
  "site:ikar.ru",
  "site:ukragroconsult.com"
];

// Запрещенные домены
const EXCLUDED_DOMAINS = [
  "ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "researchgate.net", 
  "mdpi.com", "springer.com", "sciencedirect.com", "wikipedia.org"
];

export async function GET() {
  let allResults: NewsItem[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Сбор через RSS
  for (const feed of RSS_FEEDS) {
    try {
      const feedContent = await parser.parseURL(feed.url);
      feedContent.items.forEach((item: any) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        
        if (pubDate >= sevenDaysAgo && !isNaN(pubDate.getTime())) {
          allResults.push({
            title: item.title,
            url: item.link,
            content: item.contentSnippet || item.summary || "",
            published_date: pubDate.toISOString(),
            source: feed.source
          });
        }
      });
    } catch (err) {
      const e = err as Error;
      console.error(`RSS Error for ${feed.source}:`, e.message);
    }
  }

  // 2. Сбор через Tavily
  const siteQuery = SCRAPE_SITES.join(" OR ");
  const query = `(palm oil OR soybean oil OR sunflower oil) (${siteQuery})`;

  try {
    // Вызываем search у созданного клиента
    const response = await client.search(query, {
      searchDepth: "advanced",
      maxResults: 10,
      days: 7
    });

    if (response.results) {
      response.results.forEach((r: any) => {
        const pubDate = new Date(r.published_date);
        const url = r.url.toLowerCase();

        if (!r.published_date || isNaN(pubDate.getTime())) return;
        if (pubDate < sevenDaysAgo) return;
        if (EXCLUDED_DOMAINS.some(domain => url.includes(domain))) return;

        allResults.push({
          title: r.title,
          url: r.url,
          content: r.content || "",
          published_date: pubDate.toISOString(),
          source: r.source || "Verified Source"
        });
      });
    }
  } catch (err) {
    const e = err as Error;
    console.error("Tavily Search Error:", e.message);
  }

  // 3. Финальная сортировка и очистка
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

  return NextResponse.json({ news: uniqueResults.slice(0, 25) });
}
