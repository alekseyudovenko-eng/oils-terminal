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
    // Ищем новости за последние 2 дня, на английском
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    
    if (data.status !== 'ok' || !data.articles) return [];

    return data.articles
      .filter((a: any) => a.title !== '[Removed]') // Фильтр мусора
      .map((a: any) => ({
        title: a.title,
        url: a.url,
        content: a.description?.substring(0, 200) || "",
        published_date: a.publishedAt,
        source: a.source.name,
        image: a.urlToImage || undefined
      }));
  } catch (e) {
    console.error("NewsAPI Error:", e);
    return [];
  }
}

export async function GET() {
  let allNews: NewsItem[] = [];
  const queries = ['palm oil', 'crude palm oil', 'soybean oil', 'sunflower oil'];

  for (const query of queries) {
    const items = await fetchNewsAPI(query);
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

  return NextResponse.json({ news: uniqueNews.slice(0, 25) });
}
