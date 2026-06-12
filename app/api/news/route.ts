import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

async function fetchNewsAPI(query: string, debugName: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.error(`❌ [${debugName}] NEWS_API_KEY is missing`);
    return [];
  }

  try {
    // ВРЕМЕННО: без фильтра по дате, чтобы проверить, есть ли новости вообще
    // Когда заработает — раскомментируй даты ниже
    // const today = new Date().toISOString().split('T')[0];
    // const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    // С датами: `...&from=${weekAgo}&to=${today}&...`
    
    console.log(`🌐 [${debugName}] Fetching: ${url.replace(apiKey, '***')}`);
    
    const res = await fetch(url, { 
      next: { revalidate: 1800 },
      headers: { 'Accept': 'application/json' }
    });
    
    const resText = await res.text();
    console.log(`📡 [${debugName}] Status: ${res.status}, Body length: ${resText.length}`);
    
    if (!res.ok) {
      console.error(`❌ [${debugName}] HTTP Error: ${resText}`);
      return [];
    }
    
    const data = JSON.parse(resText);
    
    if (data.status !== 'ok') {
      console.warn(`⚠️ [${debugName}] API Error: ${data.code} - ${data.message}`);
      return [];
    }
    
    const count = data.articles?.length || 0;
    console.log(`📦 [${debugName}] Found: ${count} articles`);
    
    if (count === 0) return [];

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]' && a.url)
      .slice(0, 10) // Берем топ-10 из каждого запроса
      .map((a: any) => ({
        title: a.title.replace(/<[^>]*>/g, ''),
        url: a.url,
        content: a.description?.substring(0, 200) || "",
        published_date: a.publishedAt,
        source: a.source?.name || 'Unknown',
        image: a.urlToImage || undefined
      }));
      
  } catch (e) {
    console.error(`💥 [${debugName}] Exception:`, e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // ОЧЕНЬ ПРОСТЫЕ запросы — одно-два слова, без сложных операторов
    // Новости по ним точно есть в индексе NewsAPI
    const queries = [
      { q: 'palm oil', name: 'palm_oil' },
      { q: 'crude palm oil', name: 'cpo' },
      { q: 'soybean oil', name: 'soybean' },
      { q: 'sunflower oil', name: 'sunflower' },
      { q: 'vegetable oil', name: 'veg_oil' },
      { q: 'EUDR', name: 'eudr' },
      { q: 'RED III', name: 'red3' },
      { q: 'Indonesia export', name: 'indo_export' },
      { q: 'Ukraine grain', name: 'ukraine' },
      { q: 'biofuel Europe', name: 'biofuel_eu' }
    ];

    for (const { q, name } of queries) {
      const items = await fetchNewsAPI(q, name);
      allNews = [...allNews, ...items];
      console.log(`📊 Accumulated: ${allNews.length} total`);
      if (allNews.length >= 50) break;
    }

    // Если новостей мало — пробуем ещё более общие запросы
    if (allNews.length < 10) {
      console.log('⚠️ Low count, trying fallback queries...');
      const fallbacks = [
        { q: 'agriculture', name: 'agri' },
        { q: 'commodity market', name: 'commodity' },
        { q: 'food industry', name: 'food' }
      ];
      for (const { q, name } of fallbacks) {
        const items = await fetchNewsAPI(q, name);
        allNews = [...allNews, ...items];
        if (allNews.length >= 30) break;
      }
    }

    // Простая дедубликация
    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      const key = n.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Сортировка по дате
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    const result = uniqueNews.slice(0, 25);
    
    console.log(`✅ FINAL: ${result.length} news returned`);
    
    return NextResponse.json({ 
      news: result,
      meta: {
        source: 'NewsAPI.org (debug mode)',
        totalFetched: allNews.length,
        afterDedupe: uniqueNews.length,
        returned: result.length,
        timestamp: new Date().toISOString(),
        hint: 'If count is low: check NewsAPI dashboard for available sources & quota'
      }
    });
    
  } catch (e) {
    console.error("❌ Critical GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch news", details: String(e) }, 
      { status: 500 }
    );
  }
}
