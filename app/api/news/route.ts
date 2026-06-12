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
  if (!apiKey) return [];

  try {
    // Даты: последние 7 дней
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&from=${weekAgo}&to=${today}&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    
    if (data.status !== 'ok' || !data.articles) return [];

    const blacklist = ['bible', 'prayer', 'recipe', 'award', 'bath', 'organics', 'pride', 'soap'];

    return data.articles
      .filter((a: any) => a.title !== '[Removed]')
      .map((a: any) => {
        // Фильтр мусора по заголовку
        const titleLower = a.title.toLowerCase();
        if (blacklist.some(word => titleLower.includes(word))) return null;
        
        return {
          title: a.title,
          url: a.url,
          content: a.description?.substring(0, 200) || "",
          published_date: a.publishedAt,
          source: a.source.name,
          image: a.urlToImage || undefined
        };
      })
      .filter((n: NewsItem | null) => n !== null) as NewsItem[];
      
  } catch (e) {
    console.error("NewsAPI Error:", e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    const queries = [
      '"palm oil" price market',
      '"crude palm oil" export Indonesia',
      '"soybean oil" CBOT futures',
      '"sunflower oil" export Ukraine',
      '"CPO reference price" Indonesia'
    ];

    for (const query of queries) {
      const items = await fetchNewsAPI(query);
      console.log(`🔍 Query "${query}": ${items.length} items`);
      allNews = [...allNews, ...items];
      if (allNews.length >= 15) break;
    }

    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      const key = n.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ Final: ${uniqueNews.length} unique news`);
    return NextResponse.json({ news: uniqueNews.slice(0, 25) });
    
  } catch (e) {
    console.error("❌ GET error:", e);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
