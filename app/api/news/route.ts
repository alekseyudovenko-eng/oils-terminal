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

// Максимально широкий список RSS (Открытые источники)
const RSS_FEEDS = [
  { url: 'https://www.reutersagency.com/feed/?best-topics=commodities&post_type=best', source: 'Reuters Commodities' },
  { url: 'https://www.investing.com/rss/news_25.rss', source: 'Investing.com Commodities' },
  { url: 'https://www.tradingeconomics.com/rss.aspx?feed=commodities', source: 'TradingEconomics' },
  { url: 'https://www.apk-inform.com/en/rss/maslichnye.xml', source: 'APK-Inform' },
  { url: 'https://www.world-grain.com/rss/feed', source: 'World Grain' },
  { url: 'https://agritrade.ec.europa.eu/news/rss_en', source: 'EU AgriTrade' },
  { url: 'https://www.feednavigator.com/rss/section/1234', source: 'FeedNavigator' }, // Проверь актуальный ID раздела
];

// Запросы для Tavily (Поиск по открытым новостям за 14 дней)
const SEARCH_QUERIES = [
  "palm oil price news last 14 days",
  "soybean oil market analysis last 14 days",
  "sunflower oil export Ukraine Russia news last 14 days",
  "rapeseed oil Europe market news last 14 days",
  "coconut oil Philippines Indonesia news last 14 days",
  "vegetable oils supply demand forecast 2026"
];

const EXCLUDED_DOMAINS = [
  "ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "researchgate.net", 
  "mdpi.com", "springer.com", "sciencedirect.com", "wikipedia.org",
  "youtube.com", "facebook.com", "twitter.com", "pinterest.com"
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
        
        // Фильтр по ключевым словам масел
        if (titleLower.includes('oil') || titleLower.includes('palm') || titleLower.includes('soy') || titleLower.includes('fat')) {
           if (!isNaN(pubDate.getTime()) && pubDate >= dateLimit) {
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
      console.error(`RSS Error for ${feed.source}`);
    }
  }

  // 2. Сбор через Tavily (Широкий поиск)
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

          // Пытаемся найти дату, если нет - ставим сегодняшнюю (чтобы не терять новость)
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
            source: r.source || "Global News"
          });
        });
      }
    } catch (err) {
      console.error("Tavily Search Error");
    }
  }

  // 3. Сортировка и уникализация
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

  return NextResponse.json({ news: uniqueResults.slice(0, 40) });
}
