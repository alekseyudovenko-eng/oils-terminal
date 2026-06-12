import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

// Функция для извлечения реальной ссылки из прокси-ссылки Гугла
function extractRealUrl(googleUrl: string): string {
  try {
    // Гугл форматирует ссылки как: https://news.google.com/rss/articles/...?url=REAL_URL...
    const urlObj = new URL(googleUrl);
    const realUrlParam = urlObj.searchParams.get('url');
    if (realUrlParam) return decodeURIComponent(realUrlParam);
    
    // Если параметра нет, пробуем распарсить путь (старый формат)
    if (urlObj.pathname.includes('/articles/')) {
      const parts = urlObj.pathname.split('/');
      const encoded = parts[parts.length - 1];
      if (encoded && encoded.startsWith('CBM')) {
         // Это сложный случай, но часто там просто закодированный оригинал
         // Для простоты вернем оригинал, если не удалось распаковать
      }
    }
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

// Парсер RSS от Google News
function parseGoogleRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  // Регулярка ищет блоки <item>...</item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    
    // Извлекаем поля
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = content.match(/<link>(.*?)<\/link>/);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = content.match(/<source[^>]*>(.*?)<\/source>/);
    
    if (titleMatch && linkMatch) {
      const rawUrl = linkMatch[1].trim();
      items.push({
        title: titleMatch[1].trim().replace(/&amp;/g, '&'),
        url: extractRealUrl(rawUrl), // Распаковываем ссылку!
        content: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : "",
        published_date: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        source: sourceMatch ? sourceMatch[1].trim() : 'Google News'
      });
    }
  }
  return items;
}

async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  try {
    // Формируем ссылку на RSS Гугл-Новостей
    // qdr:d = за последние 24 часа (как в твоем примере)
    // hl=ru, gl=RU - можно менять под регион
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ru&gl=RU&ceid=RU:ru&qdr:d`;
    
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 1800 } // Кэш на 30 минут
    });
    
    if (!res.ok) return [];
    
    const xml = await res.text();
    return parseGoogleRSS(xml);
    
  } catch (e) {
    console.error(`❌ Google RSS Error for "${query}":`, e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // Запросы, которые дают хорошую выдачу в Гугле
    const queries = [
      'vegetable oil market news',
      'palm oil price Indonesia',
      'crude palm oil export',
      'soybean oil CBOT price',
      'sunflower oil market Ukraine'
    ];

    for (const query of queries) {
      const items = await fetchGoogleNews(query);
      console.log(`🔍 Google Query "${query}": ${items.length} items`);
      allNews = [...allNews, ...items];
      // Собираем побольше, потом отфильтруем дубли
      if (allNews.length >= 30) break; 
    }

    // Умная дедубликация (по заголовку, игнорируя регистр)
    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      // Нормализуем заголовок для сравнения
      const key = n.title.toLowerCase().replace(/[^\wа-яё]/gi, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Сортировка по дате (сначала новые)
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    console.log(`✅ Final: ${uniqueNews.length} unique news`);
    
    return NextResponse.json({ 
      news: uniqueNews.slice(0, 25),
      meta: {
        source: 'Google News RSS',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ Critical Error:", e);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
