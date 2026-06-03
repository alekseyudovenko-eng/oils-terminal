import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { tavily } from '@tavily/core';

const parser = new Parser();
const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Расширенный список RSS лент
const RSS_FEEDS = [
  { url: 'https://www.apk-inform.com/en/rss/maslichnye.xml', source: 'APK-Inform (EN)' },
  { url: 'https://www.apk-inform.com/ru/rss/maslichnye.xml', source: 'APK-Inform (RU)' },
  { url: 'https://www.producer.com/feed/', source: 'The Western Producer' },
  { url: 'https://www.world-grain.com/rss/feed', source: 'World Grain' },
  { url: 'http://www.fao.org/news/rss-news/en/', source: 'FAO' },
  { url: 'https://agritrade.ec.europa.eu/news/rss_en', source: 'EU AgriTrade' },
];

// Ключевые слова для поиска
const KEYWORDS = [
  "palm oil market",
  "soybean oil price",
  "sunflower oil export",
  "rapeseed oil forecast",
  "coconut oil trade",
  "vegetable oils supply demand"
];

// Домены для приоритетного поиска (site:...)
const TARGET_SITES = [
  "mpoc.org.my",
  "gapki.id",
  "theedgemarkets.com",
  "noticiasagricolas.com.br",
  "bolsadecereales.com.ar",
  "ukragroconsult.com",
  "fastmarkets.com", // Часто имеют открытые превью
  "argusmedia.com",  // Часто имеют открытые превью
  "reuters.com/markets/commodities",
  "bloomberg.com/green",
  "ikar.ru",
  "sovecon.ru"
];

// Запрещенные домены
const EXCLUDED_DOMAINS = [
  "ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "researchgate.net", 
  "mdpi.com", "springer.com", "sciencedirect.com", "wikipedia.org",
  "youtube.com", "facebook.com", "twitter.com"
];

export async function GET() {
  let allResults: NewsItem[] = [];
  const daysAgo = 14; // Расширяем до 14 дней
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - daysAgo);

  // 1. Сбор через RSS
  for (const feed of RSS_FEEDS) {
    try {
      const feedContent = await parser.parseURL(feed.url);
      feedContent.items.forEach((item: any) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        
        if (pubDate >= dateLimit && !isNaN(pubDate.getTime())) {
          // Простая фильтрация по ключевым словам в заголовке
          const titleLower = item.title.toLowerCase();
          if (titleLower.includes('oil') || titleLower.includes('palm') || titleLower.includes('soy') || titleLower.includes('sunflower')) {
             allResults.push({
              title: item.title,
              url: item.link,
              content: item.contentSnippet || item.summary || "",
              published_date: pubDate.toISOString(),
              source: feed.source
            });
          }
        }
      });
    } catch (err) {
      const e = err as Error;
      console.error(`RSS Error for ${feed.source}:`, e.message);
    }
  }

  // 2. Сбор через Tavily (Гибридный поиск)
  // Разбиваем на 2 больших запроса, чтобы охватить всё
  const siteQuery = TARGET_SITES.map(s => `site:${s}`).join(" OR ");
  
  const queries = [
    `(palm oil OR soybean oil) (${siteQuery})`,
    `(sunflower oil OR rapeseed oil OR coconut oil) (${siteQuery})`
  ];

  for (const q of queries) {
    try {
      const response = await client.search(q, {
        searchDepth: "advanced",
        maxResults: 8, // Больше результатов
        days: 14, // Фильтр Tavily
        includeAnswer: false
      });

      if (response.results) {
        response.results.forEach((r: any) => {
          const pubDate = new Date(r.published_date);
          const url = r.url.toLowerCase();

          if (!r.published_date || isNaN(pubDate.getTime())) return;
          if (pubDate < dateLimit) return;
          if (EXCLUDED_DOMAINS.some(domain => url.includes(domain))) return;

          allResults.push({
            title: r.title,
            url: r.url,
            content: r.content || "",
            published_date: pubDate.toISOString(),
            source: r.source || "Market News"
          });
        });
      }
    } catch (err) {
      const e = err as Error;
      console.error("Tavily Search Error:", e.message);
    }
  }

  // 3. Финальная сортировка и очистка
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  
  // Убираем дубликаты по URL
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

  return NextResponse.json({ news: uniqueResults.slice(0, 30) });
}
