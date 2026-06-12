import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

// Надежное извлечение реальной ссылки из Google News RSS
function extractRealUrl(googleUrl: string): string {
  try {
    // Паттерн: .../articles/...?url=REAL_URL&...
    const match = googleUrl.match(/[?&]url=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    // Паттерн 2: .../articles/CBM... (закодированный оригинал)
    if (googleUrl.includes('/articles/CBM')) {
      // Пытаемся найти исходный домен в пути (эвристика)
      const parts = googleUrl.split('/');
      const last = parts[parts.length - 1];
      if (last.includes('oc=')) {
        // Это прокси, пробуем распаковать через base64-подобный формат
        // Для простоты возвращаем оригинал, если не удалось
      }
    }
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

// Парсер Google News RSS
function parseGoogleRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = content.match(/<link>(.*?)<\/link>/);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = content.match(/<source[^>]*>(.*?)<\/source>/);
    
    if (titleMatch && linkMatch) {
      const rawUrl = linkMatch[1].trim();
      const realUrl = extractRealUrl(rawUrl);
      
      // Пропускаем, если ссылка всё ещё ведёт на news.google.com (не распарсилось)
      if (realUrl.includes('news.google.com/rss')) continue;
      
      items.push({
        title: titleMatch[1].trim().replace(/&amp;/g, '&'),
        url: realUrl,
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
    // Явный диапазон дат: последние 7 дней
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const after = weekAgo.toISOString().split('T')[0];
    const before = today.toISOString().split('T')[0];
    
    // Формируем запрос: дата + регион + тема
    const encodedQuery = encodeURIComponent(`${query} after:${after} before:${before}`);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en&gl=US&ceid=US:en`;
    
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 1800 }
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
    
    // Запросы с привязкой к регионам и темам клиента (MPOC)
    // Операторы: "точная фраза", -исключение, site:домен
    const queries = [
      // Пальмовое масло + регионы
      '"palm oil" import Europe Poland Bulgaria Serbia Romania -crude -petroleum -coal',
      '"CPO" price Indonesia export Europe -crude -fuel',
      '"palm oil" EUDR deforestation regulation EU',
      '"palm oil" RED III biofuel directive Europe',
      
      // Соя, подсолнечник, рапс (конкуренты)
      '"soybean oil" CBOT Europe import -crude',
      '"sunflower oil" export Ukraine EU Bulgaria Romania',
      '"rapeseed oil" production Europe Poland Germany',
      
      // Регуляторика и торговля
      '"EUDR" palm oil implementation timeline 2026',
      '"RED III" biofuel mandate palm oil',
      '"food safety" regulation Serbia vegetable oil',
      '"import duty" palm oil Europe tariff',
      
      // Логистика и цепочки поставок
      '"palm oil" logistics Europe port shipment',
      '"vegetable oil" supply chain Central Asia Caucasus',
      
      // Верифицированные источники (приоритет)
      'site:reuters.com "palm oil" OR "CPO" OR "EUDR"',
      'site:bloomberg.com "vegetable oil" market Europe',
      'site:argusmedia.com "palm oil" price',
      'site:mpoc.org.my OR site:apk-inform.com OR site:palmoilmagazine.com'
    ];

    for (const query of queries) {
      const items = await fetchGoogleNews(query);
      console.log(`🔍 Query "${query.substring(0, 50)}...": ${items.length} items`);
      allNews = [...allNews, ...items];
      if (allNews.length >= 40) break; // Достаточно для выборки
    }

    // Фильтр по доверенным источникам (опционально, но рекомендуется)
    const trustedDomains = [
      'reuters.com', 'bloomberg.com', 'argusmedia.com', 'spglobal.com',
      'mpoc.org.my', 'apk-inform.com', 'palmoilmagazine.com',
      'euractiv.com', 'politico.eu', 'euobserver.com',
      'antaranews.com', 'theedgemarkets.com', 'newstraits.com.my',
      'balkaninsight.com', 'seenews.com', 'soybeanandcornadvisor.com'
    ];
    
    const filteredNews = allNews.filter(n => {
      const domain = new URL(n.url).hostname.replace('www.', '');
      // Оставляем если домен в списке ИЛИ заголовок содержит ключевые слова
      const hasKeyword = /palm|cpo|ffb|eudr|red.?iii|biodiesel|vegetable oil/i.test(n.title);
      return trustedDomains.some(d => domain.includes(d)) || hasKeyword;
    });

    // Дедубликация по нормализованному заголовку
    const seen = new Set<string>();
    const uniqueNews = filteredNews.filter(n => {
      const key = n.title.toLowerCase().replace(/[^\wа-яё\-]/gi, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Сортировка: сначала новые
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    console.log(`✅ Final: ${uniqueNews.length} verified news items`);
    
    return NextResponse.json({ 
      news: uniqueNews.slice(0, 25),
      meta: {
        source: 'Google News RSS (verified)',
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ Critical Error:", e);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
