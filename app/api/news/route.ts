import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { tavily } from '@tavily/core';

const parser = new Parser();

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Список RSS лент (Надежные источники)
const RSS_FEEDS = [
  { url: 'https://www.apk-inform.com/ru/rss/maslichnye.xml', source: 'APK-Inform' }, // АПК-Информ (Масличные)
  { url: 'https://www.producer.com/feed/', source: 'The Western Producer' }, // Канада (Канола)
  { url: 'https://www.world-grain.com/rss/feed', source: 'World Grain' }, // Глобально
  { url: 'http://www.fao.org/news/rss-news/en/', source: 'FAO' }, // ООН
  { url: 'https://www.zerno-online.ru/rss/maslichnye', source: 'Zerno Online' }, // Зерно Он-Лайн
];

// Список сайтов для Tavily (Нет RSS, но есть открытые новости)
const SCRAPE_SITES = [
  "site:mpoc.org.my", // Малайзия
  "site:gapki.id", // Индонезия
  "site:theedgemarkets.com", // Малайзия (Бизнес)
  "site:noticiasagricolas.com.br", // Бразилия
  "site:bolsadecereales.com.ar", // Аргентина
  "site:sovecon.ru", // РФ (СовЭкон)
  "site:ikar.ru", // РФ (ИКАР)
  "site:ukragroconsult.com" // Украина
];

// Запрещенные домены (Научные и прочий мусор)
const EXCLUDED_DOMAINS = [
  "ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "researchgate.net", 
  "mdpi.com", "springer.com", "sciencedirect.com", "wikipedia.org"
];

export async function GET() {
  let allResults: NewsItem[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Сбор через RSS (Быстро и точно)
  for (const feed of RSS_FEEDS) {
    try {
      const feedContent = await parser.parseURL(feed.url);
      feedContent.items.forEach((item: any) => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        
        // Строгая проверка даты
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
    } catch (e) {
      console.error(`RSS Error for ${feed.source}:`, e.message);
    }
  }

  // 2. Сбор через Tavily (Для сайтов без RSS)
  // Группируем запросы, чтобы не превысить лимиты
  const siteQuery = SCRAPE_SITES.join(" OR ");
  const query = `(palm oil OR soybean oil OR sunflower oil) (${siteQuery})`;

  try {
    const response = await tavily.search(query, {
      searchDepth: "advanced",
      maxResults: 10,
      days: 7, // Фильтр последней недели
      includeAnswer: false
    });

    if (response.results) {
      response.results.forEach((r: any) => {
        const pubDate = new Date(r.published_date);
        const url = r.url.toLowerCase();

        // Проверка: Есть ли дата?
        if (!r.published_date || isNaN(pubDate.getTime())) return;

        // Проверка: Дата свежая?
        if (pubDate < sevenDaysAgo) return;

        // Проверка: Не научная ли статья?
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
  } catch (e) {
    console.error("Tavily Search Error:", e);
  }

  // 3. Финальная сортировка и очистка
  allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  
  // Убираем дубликаты по URL
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

  return NextResponse.json({ news: uniqueResults.slice(0, 25) });
}
