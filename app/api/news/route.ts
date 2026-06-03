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

// ПРОВЕРЕННЫЕ RSS ЛЕНТЫ (Отдают валидный XML)
const RSS_FEEDS = [
  // АПК-Информ (Масличные и Зерно - так как они взаимосвязаны)
  { url: 'https://www.apk-inform.com/en/news/rss', source: 'APK-Inform' }, 
  // World Grain (Масличные и переработка)
  { url: 'https://www.world-grain.com/rss/feed', source: 'World Grain' },
  // FAO (Глобальные индексы цен)
  { url: 'http://www.fao.org/news/rss-news/en/', source: 'FAO' },
  // The Western Producer (Канола/Рапс)
  { url: 'https://www.producer.com/feed/', source: 'The Western Producer' },
];

// Ключевые слова для фильтрации (чтобы не брать новости про пшеницу или сахар)
const OIL_KEYWORDS = [
  'oil', 'palm', 'soy', 'sunflower', 'rapeseed', 'canola', 'coconut', 
  'olive', 'fat', 'olein', 'crushing', 'processing', 'biodiesel', 'meal'
];

// Запросы для Tavily (для填补 пробелов, если RSS мало)
const SEARCH_QUERIES = [
  "palm oil market news last 14 days",
  "soybean oil price analysis last 14 days",
  "sunflower oil export Ukraine Russia last 14 days"
];

const EXCLUDED_DOMAINS = [
  "ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "researchgate.net", 
  "mdpi.com", "springer.com", "sciencedirect.com", "wikipedia.org",
  "youtube.com", "facebook.com", "twitter.com"
];

export async function GET() {
  let allResults: NewsItem[] = [];
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 14);

  // 1. Сбор через RSS
  for (const feed of RSS_FEEDS) {
    try {
      const feedContent = await parser.parseURL(feed.url);
      feedContent.items.forEach((item: any) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        const titleLower = (item.title || "").toLowerCase();
        const descLower = (item.contentSnippet || item.summary || "").toLowerCase();
        
        // Проверка: есть ли ключевые слова масел в заголовке или описании
        const hasOilKeyword = OIL_KEYWORDS.some(keyword => 
          titleLower.includes(keyword) || descLower.includes(keyword)
        );

        if (hasOilKeyword && !isNaN(pubDate.getTime()) && pubDate >= dateLimit) {
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
      console.error(`RSS Error for ${feed.source}:`, (err as Error).message);
    }
  }

  // 2. Сбор через Tavily (Если новостей из RSS мало)
  if (allResults.length < 5) {
    for (const query of SEARCH_QUERIES) {
      try {
        const response = await client.search(query, {
          searchDepth: "advanced",
          maxResults: 5,
          days: 14,
          includeAnswer: false
        });

        if (response.results) {
          response.results.forEach((r: any) => {
            const url = r.url.toLowerCase();
            if (EXCLUDED_DOMAINS.some(domain => url.includes(domain))) return;

            let pubDate = new Date();
            if (r.published_date) {
              const parsed = new Date(r.published_date);
              if (!isNaN(parsed.getTime())) pubDate = parsed;
            }

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
        console.error("Tavily Search Error");
      }
    }
  }

  // 3. Сортировка и уникализация
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

  return NextResponse.json({ news: uniqueResults.slice(0, 30) });
}
