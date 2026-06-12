import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

// Надежное извлечение ссылки из Google News
function extractRealUrl(googleUrl: string): string {
  if (!googleUrl || !googleUrl.includes('news.google.com')) {
    return googleUrl;
  }
  
  try {
    // Пробуем найти параметр ?url=...
    const urlObj = new URL(googleUrl);
    
    // Вариант 1: ?url=REAL_URL
    const urlParam = urlObj.searchParams.get('url');
    if (urlParam) {
      return decodeURIComponent(urlParam);
    }
    
    // Вариант 2: &url=REAL_URL
    const andUrl = urlObj.searchParams.get('&url');
    if (andUrl) {
      return decodeURIComponent(andUrl);
    }
    
    // Вариант 3: ссылка в формате /articles/CBM... (закодирована)
    // Гугл кодирует оригинальную ссылку в конце пути
    if (urlObj.pathname.includes('/articles/')) {
      const parts = urlObj.pathname.split('/');
      const encoded = parts[parts.length - 1];
      if (encoded && (encoded.startsWith('CBM') || encoded.startsWith('LBM'))) {
        // Это сложный случай — Гугл использует собственный base64-подобный формат
        // Для простоты вернем оригинал, но можно добавить декодер при необходимости
        // Часто в описании <description> есть прямая ссылка
        return googleUrl; 
      }
    }
    
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

// Парсер Google News RSS — упрощенный и надежный
function parseGoogleRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  // Ищем все <item> блоки
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    
    // Извлекаем поля с защитой от отсутствия
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = content.match(/<link>(.*?)<\/link>/i);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/i);
    const sourceMatch = content.match(/<source[^>]*>(.*?)<\/source>/i);
    
    // Пропускаем, если нет заголовка или ссылки
    if (!titleMatch || !linkMatch) continue;
    
    const title = titleMatch[1].trim().replace(/&amp;/g, '&');
    const rawUrl = linkMatch[1].trim();
    const realUrl = extractRealUrl(rawUrl);
    
    // Если ссылка всё ещё ведёт на news.google.com — пробуем найти в описании
    let finalUrl = realUrl;
    if (realUrl.includes('news.google.com') && descMatch) {
      const desc = descMatch[1];
      // Ищем прямую ссылку в описании: <a href="REAL_URL">
      const directLink = desc.match(/href="([^"]+)"[^>]*>(?:<[^>]*>)*\s*$/i);
      if (directLink && !directLink[1].includes('news.google.com')) {
        finalUrl = directLink[1];
      }
    }
    
    // Пропускаем, если не удалось получить нормальную ссылку
    if (finalUrl.includes('news.google.com/rss')) continue;
    
    items.push({
      title,
      url: finalUrl,
      content: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : "",
      published_date: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
      source: sourceMatch ? sourceMatch[1].trim() : 'Google News',
      image: undefined // Google RSS редко отдает картинки напрямую
    });
  }
  
  return items;
}

async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  try {
    // Убираем date operators — Google RSS их плохо поддерживает
    // Фильтр по дате сделаем в коде после получения
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en&gl=US&ceid=US:en`;
    
    const res = await fetch(rssUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      next: { revalidate: 1800 }
    });
    
    if (!res.ok) {
      console.error(`❌ Google RSS HTTP ${res.status} for query: ${query}`);
      return [];
    }
    
    const xml = await res.text();
    
    // Лог для отладки: смотрим, что реально пришло
    if (xml.length < 500) {
      console.warn(`⚠️ Google RSS returned short response for "${query}": ${xml.substring(0, 200)}`);
    }
    
    return parseGoogleRSS(xml);
    
  } catch (e) {
    console.error(`💥 Google RSS Exception for "${query}":`, e);
    return [];
  }
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // Простые, но точные запросы — без сложных операторов
    const queries = [
      'palm oil Europe import',
      'CPO price Indonesia export',
      'palm oil EUDR regulation',
      'palm oil RED III biofuel',
      'soybean oil market Europe',
      'sunflower oil Ukraine export',
      'rapeseed oil Poland production',
      'palm oil Serbia food industry',
      'vegetable oil Central Asia trade',
      'palm oil Bulgaria import tariff'
    ];

    for (const query of queries) {
      const items = await fetchGoogleNews(query);
      console.log(`🔍 Query "${query}": ${items.length} items`);
      allNews = [...allNews, ...items];
      if (allNews.length >= 50) break;
    }

    // Фильтр по дате: последние 7 дней (в коде, не в запросе)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentNews = allNews.filter(n => {
      const pubDate = new Date(n.published_date).getTime();
      return pubDate >= weekAgo;
    });

    // Фильтр по ключевым словам (убираем совсем нерелевантное)
    const requiredKeywords = /palm|cpo|ffb|eudr|red.?iii|biodiesel|vegetable oil|soybean|sunflower|rapeseed|coconut|food industry|import|export|tariff|regulation/i;
    const blacklist = /\b(gold|mining|coal|copper|nickel|bible|prayer|ramadan|recipe|award|bath|organics|pride|soap|cosmetic)\b/i;
    
    const filteredNews = recentNews.filter(n => {
      const text = n.title + ' ' + n.content;
      return requiredKeywords.test(text) && !blacklist.test(text);
    });

    // Дедубликация
    const seen = new Set<string>();
    const uniqueNews = filteredNews.filter(n => {
      const key = n.title.toLowerCase().replace(/[^\wа-яё\-]/gi, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Сортировка по дате
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    console.log(`✅ Final: ${uniqueNews.length} verified news items`);
    
    return NextResponse.json({ 
      news: uniqueNews.slice(0, 25),
      meta: {
        source: 'Google News RSS',
        dateRange: {
          from: new Date(weekAgo).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        totalFetched: allNews.length,
        afterFilters: uniqueNews.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ Critical Error in GET:", e);
    return NextResponse.json({ error: "Failed to fetch news", details: String(e) }, { status: 500 });
  }
}
