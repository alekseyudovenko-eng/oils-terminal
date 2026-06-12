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
    console.error("❌ NEWS_API_KEY is not set");
    return [];
  }

  try {
    // Даты: последние 7 дней (бесплатный тариф позволяет до 30)
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&from=${weekAgo}&to=${today}&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    const res = await fetch(url, { next: { revalidate: 1800 } });
    
    if (!res.ok) {
      console.error(`❌ NewsAPI HTTP ${res.status}: ${await res.text()}`);
      return [];
    }
    
    const data = await res.json();
    
    if (data.status !== 'ok' || !data.articles) {
      console.warn(`⚠️ NewsAPI returned: ${data.status || 'no data'}`);
      return [];
    }

    // Обязательные ключевые слова (хотя бы одно должно быть в заголовке или описании)
    const requiredKeywords = [
      'palm', 'cpo', 'ffb', 'soybean', 'sunflower', 'rapeseed', 'coconut',
      'biodiesel', 'vegetable oil', 'palm oil', 'cpo price', 'ffob'
    ];
    
    // Стоп-слова (если есть в заголовке — отбрасываем)
    const blacklist = [
      'bible', 'prayer', 'recipe', 'award', 'bath', 'organics', 'pride',
      'soap', 'cosmetic', 'shampoo', 'lotions', 'mindful', 'wellness'
    ];

    return data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((a: any) => {
        const title = a.title;
        const desc = a.description || '';
        const text = (title + ' ' + desc).toLowerCase();
        
        // 1. Фильтр по стоп-словам
        if (blacklist.some(word => text.includes(word))) {
          return null;
        }
        
        // 2. Фильтр по обязательным ключевым словам
        if (!requiredKeywords.some(kw => text.includes(kw))) {
          return null;
        }
        
        return {
          title: title.replace(/<[^>]*>/g, ''),
          url: a.url,
          content: desc?.substring(0, 200) || "",
          published_date: a.publishedAt,
          source: a.source?.name || 'Unknown',
          image: a.urlToImage || undefined
        };
      })
      .filter((n: NewsItem | null) => n !== null) as NewsItem[];
      
  } catch (e) {
    console.error("💥 NewsAPI Exception:", e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // Запросы с операторами исключения (-слово) и точными фразами ("...")
    const queries = [
      '"palm oil" price market -crude -petroleum -coal -nickel -copper',
      '"crude palm oil" export Indonesia -coal -mining -metal',
      '"soybean oil" CBOT futures -crude -petroleum',
      '"sunflower oil" export Ukraine -crude',
      '"CPO" reference price Indonesia -crude -petroleum',
      '"FFB" price palm oil Indonesia',
      '"biodiesel" palm OR soybean OR sunflower -diesel -fuel -petroleum'
    ];

    for (const query of queries) {
      const items = await fetchNewsAPI(query);
      console.log(`🔍 Query "${query.substring(0, 40)}...": ${items.length} items`);
      allNews = [...allNews, ...items];
      if (allNews.length >= 20) break; // Достаточно, выходим
    }

    // Дедубликация по заголовку (нижний регистр)
    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      const key = n.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ Final result: ${uniqueNews.length} unique news items`);
    
    return NextResponse.json({ 
      news: uniqueNews.slice(0, 25),
      meta: {
        totalFound: allNews.length,
        afterDedupe: uniqueNews.length,
        source: 'NewsAPI.org',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ GET handler error:", e);
    return NextResponse.json(
      { error: "Failed to fetch news", details: String(e) }, 
      { status: 500 }
    );
  }
}
