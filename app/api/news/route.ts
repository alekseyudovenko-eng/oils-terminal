import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Декодер HTML-сущностей (&#8216; → ', &amp; → &, etc.)
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&#8216;': "'", '&#8217;': "'", '&#8220;': '"', '&#8221;': '"',
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—'
  };
  return text.replace(/&[#a-z0-9]+;/gi, (match) => entities[match.toLowerCase()] || match);
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
        title: decodeHtmlEntities(titleMatch[1].trim()),
        url: linkMatch[1].trim(),
        content: descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200)) : "",
        published_date: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        source: sourceName
      });
    }
  }
  return items;
}

// 🔥 СТРОГИЙ ФИЛЬТР: только новости про масла
function isRelevant(news: NewsItem): boolean {
  const text = (news.title + ' ' + news.content).toLowerCase();
  
  // ✅ БЕЛЫЙ СПИСОК: если есть ХОТЯ БЫ ОДНО из этих слов — новость релевантна
  const oilKeywords = [
    // === МАСЛА ===
    'palm oil', 'crude palm', 'cpo', 'ffb', 'fresh fruit bunch',
    'soybean oil', 'soy oil', 'soyoil',
    'sunflower oil', 'sunfloweroil',
    'rapeseed oil', 'canola oil',
    'coconut oil', 'copra',
    'vegetable oil', 'edible oil', 'plant oil',
    'palm kernel oil', 'pko', 'olein', 'stearin',
    
    // === РЫНОК / ЦЕНЫ / ТОРГОВЛЯ ===
    'cpo price', 'ffb price', 'palm price', 'vegetable oil price',
    'export duty', 'export tax', 'import tariff', 'reference price',
    'palm oil export', 'palm oil import', 'vegetable oil trade',
    'palm oil mill', 'palm oil refinery', 'crushing margin',
    
    // === БИОТОПЛИВО / РЕГУЛЯТОРИКА ===
    'biodiesel', 'biofuel', 'renewable fuel', 'sustainable aviation fuel',
    'eudr', 'deforestation regulation', 'eu deforestation',
    'red iii', 'red3', 'renewable energy directive',
    'rsppo', 'mspo', 'iscc', 'sustainable palm',
    
    // === ИНДУСТРИЯ / ПРОИЗВОДСТВО ===
    'palm oil production', 'palm oil yield', 'palm oil stock',
    'palm oil demand', 'palm oil consumption',
    'smallholder palm', 'palm oil plantation', 'palm oil farmer',
    
    // === КОНКУРЕНТЫ / ЗАМЕСТИТЕЛИ ===
    'soybean meal', 'sunflower meal', 'rapeseed meal',
    'vegetable oil substitution', 'oilseed complex'
  ];
  
  // Проверяем: есть ли хотя бы одно ключевое слово?
  return oilKeywords.some(kw => text.includes(kw.toLowerCase()));
}

export async function GET() {
  try {
    let allNews: NewsItem[] = [];
    
    // === ПРОВЕРЕННЫЕ ИСТОЧНИКИ ===
    const rssSources = [
      // 🌴 PALM OIL / ID / MY
      { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' },
      { url: 'https://mpoc.org.my/feed/', name: 'MPOC' },
      { url: 'https://gapki.id/feed/', name: 'GAPKI' },
      { url: 'https://www.theedgemarkets.com/rss', name: 'The Edge Markets' },
      { url: 'https://www.nst.com.my/rss', name: 'New Straits Times' },
      
      // 🌾 GRAINS / OILSEEDS
      { url: 'https://www.world-grain.com/rss', name: 'World-Grain' },
      { url: 'https://www.agri-pulse.com/rss', name: 'Agri-Pulse' },
      { url: 'https://www.brownfieldagnews.com/feed/', name: 'Brownfield Ag News' },
      { url: 'https://www.soybeans.org/news/feed/', name: 'United Soybean Board' },
      
      // 🌍 EU / REGULATION (только агро-разделы)
      { url: 'https://www.euractiv.com/section/agriculture-food/feed/', name: 'Euractiv Agri' },
      
      // 🇷🇺 🇺🇦 CIS / SUNFLOWER
      { url: 'https://www.apk-inform.com/ru/news/rss', name: 'APK-Inform' },
      { url: 'https://www.zerno.ua/feed/', name: 'Zerno.ua' },
      { url: 'https://www.agrotimes.net/feed/', name: 'AgroTimes' },
      
      // 🇷🇸 🇧🇬 🇵🇱 EUROPE LOCAL (Balkans, Eastern EU)
      { url: 'https://www.seenews.com/feed', name: 'SeeNews (Balkans)' },
      { url: 'https://www.balkaninsight.com/feed', name: 'Balkan Insight' },
      { url: 'https://www.b92.net/eng/rss/vesti.php', name: 'B92 (Serbia)' },
      
      // 💹 PRICES / EXCHANGES
      { url: 'https://www.barchart.com/news/rss', name: 'Barchart' },
      { url: 'https://www.investing.com/rss/news_106.rss', name: 'Investing.com Commodities' }
    ];

    // Загрузка с таймаутом
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

    // Параллельная загрузка
    const promises = rssSources.map(async (src) => {
      try {
        const res = await fetchWithTimeout(src.url);
        if (res?.ok) {
          const text = await res.text();
          return extractNewsFromRSS(text, src.name);
        }
      } catch (e) {
        // Тихо пропускаем неработающие источники
      }
      return [];
    });

    const results = await Promise.all(promises);
    for (const items of results) {
      allNews = [...allNews, ...items];
    }

    console.log(`📥 Raw: ${allNews.length} items from ${rssSources.length} sources`);

    // 🔹 ФИЛЬТР 1: Дата (последние 7 дней)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentNews = allNews.filter(n => {
      const pubDate = new Date(n.published_date).getTime();
      return pubDate >= weekAgo;
    });
    console.log(`📅 After date filter: ${recentNews.length} items`);

    // 🔹 ФИЛЬТР 2: СТРОГИЙ белый список (только масла)
    const relevantNews = recentNews.filter(isRelevant);
    console.log(`🎯 After relevance filter: ${relevantNews.length} items`);

    // 🔹 Дедубликация
    const seen = new Set<string>();
    const uniqueNews = relevantNews.filter(n => {
      const key = `${n.title.toLowerCase().trim()}|${n.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 🔹 Сортировка: сначала новые
    uniqueNews.sort((a, b) => 
      new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );

    const result = uniqueNews.slice(0, 30);
    
    console.log(`✅ Final: ${result.length} verified news items`);
    
    return NextResponse.json({ 
      news: result,
      meta: {
        source: 'Verified RSS Feeds (strict whitelist)',
        totalSources: rssSources.length,
        rawCount: allNews.length,
        afterDateFilter: recentNews.length,
        afterRelevanceFilter: relevantNews.length,
        afterDedupe: uniqueNews.length,
        returned: result.length,
        dateRange: {
          from: new Date(weekAgo).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error("❌ Critical Error:", e);
    return NextResponse.json(
      { error: "Failed to fetch news", details: String(e) }, 
      { status: 500 }
    );
  }
}
