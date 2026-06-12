import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

async function fetchNewsAPI(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ NEWS_API_KEY is missing in Vercel Environment Variables");
    return [];
  }

  try {
    // Даты: последние 7 дней
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&from=${weekAgo}&to=${today}&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    const res = await fetch(url, { 
      next: { revalidate: 1800 },
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ NewsAPI HTTP ${res.status}: ${err}`);
      return [];
    }
    
    const data = await res.json();
    
    if (data.status !== 'ok') {
      console.warn(`⚠️ NewsAPI returned: ${data.code || 'unknown error'}`, data.message);
      return [];
    }
    
    if (!data.articles || data.articles.length === 0) {
      console.log(`ℹ️ No articles for query: "${query}"`);
      return [];
    }

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]' && a.url)
      .map((a: any) => ({
        title: a.title.replace(/<[^>]*>/g, ''),
        url: a.url,
        content: a.description?.substring(0, 200) || "",
        published_date: a.publishedAt,
        source: a.source?.name || 'Unknown',
        image: a.urlToImage || undefined
      }));
      
  } catch (e) {
    console.error(`💥 NewsAPI Exception for "${query}":`, e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // Запросы, ориентированные на регионы и темы клиента (Европа, Центральная Азия, Кавказ)
    const queries = [
      'palm oil Europe import export',
      'CPO price Indonesia Malaysia',
      'palm oil EUDR regulation European Union',
      'palm oil RED III biofuel directive',
      'soybean oil market Europe CBOT',
      'sunflower oil Ukraine export Black Sea',
      'rapeseed oil production Poland Germany',
      'palm oil Serbia food industry',
      'vegetable oil trade Central Asia Caucasus',
      'palm oil Bulgaria Romania tariff'
    ];

    for (const query of queries) {
      const items = await fetchNewsAPI(query);
      console.log(`🔍 NewsAPI "${query.substring(0, 40)}...": ${items.length} items`);
      allNews = [...allNews, ...items];
      if (allNews.length >= 30) break; // Достаточно
    }

    // Легкая дедубликация (по заголовку + источнику)
    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      const key = `${n.title.toLowerCase().trim()}|${n.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Сортировка: сначала новые
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    console.log(`✅ Final: ${uniqueNews.length} news items from NewsAPI`);
    
    return NextResponse.json({ 
      news: uniqueNews.slice(0, 25),
      meta: {
        source: 'NewsAPI.org',
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        totalFetched: allNews.length,
        returned: uniqueNews.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ Critical Error in GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch news", details: String(e) }, 
      { status: 500 }
    );
  }
}
