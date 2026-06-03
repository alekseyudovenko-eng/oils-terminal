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
  
  // Вычисляем дату 7 дней назад в формате YYYY-MM-DD для фильтра Tavily
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 7);
  const afterDate = dateLimit.toISOString().split('T')[0]; // Например: "2026-05-27"

  // Строгий список источников по твоему запросу
  const sources = [
    // Глобальные
    "site:fastmarkets.com",
    "site:spglobal.com",
    "site:argusmedia.com", 
    "site:lseg.com",
    "site:istamielke.com", // Oil World
    "site:world-grain.com",
    "site:ofi-global.com", // Oils & Fats International
    
    // Черное море и ЕС
    "site:apk-inform.com",
    "site:ukragroconsult.com",
    "site:feednavigator.com",
    "site:sovecon.ru",
    "site:ikar.ru",
    
    // Азия (Пальма, Индия, Китай)
    "site:palmoilanalytics.com",
    "site:theedgemarkets.com",
    "site:mpoc.org.my",
    "site:gapki.id",
    "site:mysteel.com",
    
    // Америка (Соя, Канола)
    "site:noticiasagricolas.com.br",
    "site:bolsadecereales.com.ar",
    "site:producer.com" // The Western Producer
  ];

  // Разбиваем источники на группы, чтобы запросы не были слишком длинными
  // Tavily лучше работает с 2-3 группами по 5-7 сайтов
  const groups = [
    sources.slice(0, 7),   // Глобальные
    sources.slice(7, 12),  // Черное море/ЕС
    sources.slice(12, 17), // Азия
    sources.slice(17, 20)  // Америка
  ];

  let allResults: NewsItem[] = [];

  try {
    for (const group of groups) {
      const siteQuery = group.join(" OR ");
      // Запрос: "vegetable oils market" И (список сайтов) ПОСЛЕ даты
      const query = `(palm oil OR soybean oil OR sunflower oil OR rapeseed oil OR vegetable oils) (${siteQuery})`;

      const response = await tvly.search(query, {
        searchDepth: "advanced",
        maxResults: 5, // Берем топ-5 из каждой группы
        includeAnswer: false,
        days: 7, // Дополнительный фильтр Tavily
        // Важно: некоторые версии API поддерживают start_date/end_date, но days:7 надежнее
      });
      
      if (response.results) {
        const typedResults: NewsItem[] = response.results.map((r: any) => ({
          title: r.title || "No Title",
          url: r.url,
          content: r.content || "",
          published_date: r.published_date || new Date().toISOString(),
          source: r.source || "Agency"
        }));
        
        // Фильтруем на клиенте/API уровне еще раз для надежности
        const filtered = typedResults.filter(item => {
          const pubDate = new Date(item.published_date);
          return pubDate >= dateLimit;
        });

        allResults = [...allResults, ...filtered];
      }
    }

    // Сортируем по дате (самые свежие первыми)
    allResults.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

    // Убираем дубликаты по URL
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

    return NextResponse.json({ news: uniqueResults.slice(0, 20) });

  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
