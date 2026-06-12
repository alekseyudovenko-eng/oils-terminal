import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  console.log("🔍 Google Search Debug:", { 
    hasKey: !!apiKey, 
    hasCx: !!cx, 
    query 
  });

  if (!apiKey || !cx) {
    console.error("❌ Missing env vars");
    return [];
  }

  try {
    // Убрали dateRestrict — ищем все новости без фильтра по дате
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=news&num=10`;
    
    console.log("🌐 Request URL:", url);
    
    const res = await fetch(url, { next: { revalidate: 1800 } });
    
    console.log("📡 Status:", res.status);
    
    if (!res.ok) {
      const err = await res.text();
      console.error("❌ API Error:", err);
      return [];
    }
    
    const data = await res.json();
    console.log("📦 Response:", { 
      itemsCount: data.items?.length || 0, 
      error: data.error?.message || null 
    });
    
    if (!data.items || data.items.length === 0) return [];

    return data.items.map((item: any) => ({
      title: item.title?.replace(/<[^>]*>/g, '') || 'No title',
      url: item.link,
      content: item.snippet?.substring(0, 200) || "",
      published_date: new Date().toISOString(),
      source: 'Google Custom Search',
      image: item.pagemap?.cse_image?.[0]?.src || undefined
    }));
    
  } catch (e) {
    console.error("💥 Exception:", e);
    return [];
  }
}

export async function GET() {
  let allNews: NewsItem[] = [];

  // Запросы к Google (только они, без RSS!)
  const queries = [
    'palm oil price',
    'crude palm oil news',
    'soybean oil market'
  ];

  for (const query of queries) {
    const items = await fetchGoogleNews(query);
    allNews = [...allNews, ...items];
    if (allNews.length >= 15) break;
  }

  // Убираем дубликаты
  const seen = new Set<string>();
  const uniqueNews = allNews.filter(n => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log("✅ Final result:", { count: uniqueNews.length });

  return NextResponse.json({ 
    news: uniqueNews.slice(0, 25),
    debug: {
      totalFound: allNews.length,
      afterDedupe: uniqueNews.length,
      source: 'Google Custom Search ONLY'
    }
  });
}
