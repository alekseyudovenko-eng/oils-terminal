import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

function extractNewsFromRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = content.match(/<link>(.*?)<\/link>/i);
    const descMatch = content.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/i);
    
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim().replace(/&amp;/g, '&'),
        url: linkMatch[1].trim(),
        content: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : "",
        published_date: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        source: sourceName
      });
    }
  }
  return items;
}

export async function GET() {
  let allNews: NewsItem[] = [];
  
  // ВСЕ источники, сгруппированные по темам
  const rssSources = [
    // === PALM OIL / INDONESIA / MALAYSIA ===
    { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' },
    { url: 'https://mpoc.org.my/feed/', name: 'MPOC' },
    { url: 'https://gapki.id/feed/', name: 'GAPKI' },
    { url: 'https://www.theedgemarkets.com/rss', name: 'The Edge Markets' },
    { url: 'https://www.nst.com.my/rss', name: 'New Straits Times' },
    
    // === SOY / SUNFLOWER / RAPESEED / GRAINS ===
    { url: 'https://www.world-grain.com/rss', name: 'World-Grain' },
    { url: 'https://www.agri-pulse.com/rss', name: 'Agri-Pulse' },
    { url: 'https://www.brownfieldagnews.com/feed/', name: 'Brownfield Ag News' },
    { url: 'https://www.soybeans.org/news/feed/', name: 'United Soybean Board' },
    
    // === GLOBAL MARKETS / EU / REGULATION ===
    { url: 'https://www.reuters.com/business/energy/rss', name: 'Reuters Energy' },
    { url: 'https://www.bloomberg.com/energy/rss', name: 'Bloomberg Energy' },
    { url: 'https://www.euractiv.com/section/agriculture-food/feed/', name: 'Euractiv' },
    { url: 'https://www.politico.eu/feed/', name: 'Politico Europe' },
    { url: 'https://www.euobserver.com/rss', name: 'EUobserver' },
    
    // === CIS / UKRAINE / SUNFLOWER ===
    { url: 'https://www.apk-inform.com/ru/news/rss', name: 'APK-Inform' },
    { url: 'https://www.zerno.ua/feed/', name: 'Zerno.ua' },
    { url: 'https://www.agrotimes.net/feed/', name: 'AgroTimes' },
    
    // === PRICES / EXCHANGES ===
    { url: 'https://www.barchart.com/news/rss', name: 'Barchart' },
    { url: 'https://www.investing.com/rss/news_106.rss', name: 'Investing.com Commodities' },
    { url: 'https://www.mcxindia.com/mcxpress/rss', name: 'MCX India' }
  ];

  // Параллельная загрузка с таймаутом
  const fetchWithTimeout = async (url: string, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
        next: { revalidate: 3600 }
      });
      clearTimeout(id);
      return res;
    } catch {
      clearTimeout(id);
      throw new Error('Timeout');
    }
  };

  // Загружаем все источники параллельно
  const promises = rssSources.map(async (src) => {
    try {
      const res = await fetchWithTimeout(src.url);
      if (res?.ok) {
        const text = await res.text();
        return extractNewsFromRSS(text, src.name);
      }
    } catch (e) {
      console.warn(`⚠️ Failed to fetch ${src.name}:`, e);
    }
    return [];
  });

  const results = await Promise.all(promises);
  for (const items of results) {
    allNews = [...allNews, ...items];
  }

  console.log(`📥 Fetched ${allNews.length} raw items from ${rssSources.length} sources`);

  // Дедубликация по заголовку + источнику
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

  // Фильтр по ключевым словам (опционально, но рекомендуется)
  const requiredKeywords = /palm|cpo|ffb|soybean|sunflower|rapeseed|coconut|vegetable oil|biodiesel|eudr|red.?iii|biofuel|export|import|tariff|regulation|food industry/i;
  
  const filteredNews = uniqueNews.filter(n => 
    requiredKeywords.test(n.title + ' ' + n.content)
  );

  console.log(`✅ Final: ${filteredNews.length} verified news items`);

  return NextResponse.json({ 
    news: filteredNews.slice(0, 30),
    meta: {
      source: 'Verified RSS Feeds (multi-source)',
      totalSources: rssSources.length,
      rawCount: allNews.length,
      afterDedupe: uniqueNews.length,
      afterFilter: filteredNews.length,
      returned: Math.min(filteredNews.length, 30),
      timestamp: new Date().toISOString()
    }
  });
}
