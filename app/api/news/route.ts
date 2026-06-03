import { NextResponse } from 'next/server';
import { tavily } from '@tavily/core';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

export async function GET() {
  const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  
  // Ключевые запросы по твоим источникам
  const queries = [
    "site:usda.gov OR site:mpob.gov.my OR site:gapki.id OR site:seaofindia.org OR site:conab.gov.br palm oil soybean oil market news last 7 days",
    "site:fastmarkets.com OR site:spglobal.com OR site:argusmedia.com OR site:lseg.com vegetable oils price analysis last 7 days",
    "site:ikar.ru OR site:sovecon.ru sunflower oil export Russia news last 7 days",
    "site:ec.europa.eu/agriculture rapeseed sunflower oil import data last 7 days",
    "site:bolsadecereales.com.ar soybean harvest Argentina news last 7 days"
  ];

  let allResults: NewsItem[] = [];

  try {
    for (const query of queries) {
      const response = await tvly.search(query, {
        searchDepth: "advanced",
        maxResults: 3,
        includeAnswer: false,
        days: 7
      });
      
      if (response.results) {
        // Приводим результаты к нашему типу
        const typedResults: NewsItem[] = response.results.map((r: any) => ({
          title: r.title || "No Title",
          url: r.url,
          content: r.content || "",
          published_date: r.published_date || new Date().toISOString(),
          source: r.source || "Unknown"
        }));
        allResults = [...allResults, ...typedResults];
      }
    }

    // Сортируем по дате (самые свежие первыми)
    allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

    // Убираем дубликаты по URL
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

    return NextResponse.json({ news: uniqueResults.slice(0, 15) });

  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
