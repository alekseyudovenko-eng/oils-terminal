import { NextResponse } from 'next/server';
import { tavily } from '@tavily/core';

export async function GET() {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  
  // Ключевые запросы, имитирующие мониторинг твоих источников
  const queries = [
    "site:usda.gov OR site:mpob.gov.my OR site:gapki.id OR site:seaofindia.org OR site:conab.gov.br palm oil soybean oil market news last 7 days",
    "site:fastmarkets.com OR site:spglobal.com OR site:argusmedia.com OR site:lseg.com vegetable oils price analysis last 7 days",
    "site:ikar.ru OR site:sovecon.ru sunflower oil export Russia news last 7 days",
    "site:ec.europa.eu/agriculture rapeseed sunflower oil import data last 7 days",
    "site:bolsadecereales.com.ar soybean harvest Argentina news last 7 days"
  ];

  let allResults = [];

  try {
    for (const query of queries) {
      const response = await tvly.search(query, {
        searchDepth: "advanced",
        maxResults: 3, // Берем топ-3 по каждому направлению
        includeAnswer: false,
        days: 7 // Ищем только за последнюю неделю
      });
      
      if (response.results) {
        allResults = [...allResults, ...response.results];
      }
    }

    // Сортируем по дате (самые свежие первыми)
    allResults.sort((a, b) => new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime());

    // Убираем дубликаты по URL
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

    return NextResponse.json({ news: uniqueResults.slice(0, 15) }); // Возвращаем топ-15 новостей

  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
