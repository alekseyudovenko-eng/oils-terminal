import { NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

// 🔧 Утилита: декодирование HTML-сущностей (&#8216; → ', &amp; → &)
function decodeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&#8216;': "'", '&#8217;': "'", '&#8220;': '"', '&#8221;': '"',
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&rsquo;': "'", '&lsquo;': "'"
  };
  return text.replace(/&[#a-z0-9]+;/gi, m => map[m.toLowerCase()] || m);
}

// 🔧 Утилита: парсинг RSS/Atom (универсальный)
function parseRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    
    const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1] || '';
    const url = block.match(/<link>(.*?)<\/link>/i)?.[1] || '';
    let content = block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i)?.[1] || '';
    if (!content) content = block.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1] || '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] || '';
    
    if (title && url) {
      const cleanContent = decodeHtmlEntities(content.replace(/<[^>]+>/g, '').substring(0, 250));
      let date = new Date().toISOString();
      try {
        const parsed = new Date(pubDate);
        if (!isNaN(parsed.getTime())) date = parsed.toISOString();
      } catch {}

      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: url.trim(),
        content: cleanContent,
        published_date: date,
        source: sourceName
      });
    }
  }
  return items;
}

// ============================================================================
// 🔰 ТРИ УРОВНЯ ФИЛЬТРАЦИИ
// ============================================================================

// 🔹 LEVEL 1: ПРОВЕРЕННЫЕ ИСТОЧНИКИ (только эти 20)
const VERIFIED_SOURCES = [
  // === 🌴 PALM OIL / ID / MY ===
  { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' },
  { url: 'https://mpoc.org.my/feed/', name: 'MPOC' },
  { url: 'https://gapki.id/feed/', name: 'GAPKI' },
  { url: 'https://www.theedgemarkets.com/rss', name: 'The Edge Markets' },
  { url: 'https://www.nst.com.my/rss', name: 'New Straits Times' },
  
  // === 🌾 OILSEEDS / GRAINS / AGRO ===
  { url: 'https://www.world-grain.com/rss', name: 'World-Grain' },
  { url: 'https://www.agri-pulse.com/rss', name: 'Agri-Pulse' },
  { url: 'https://www.brownfieldagnews.com/feed/', name: 'Brownfield Ag News' },
  { url: 'https://www.soybeans.org/news/feed/', name: 'United Soybean Board' },
  
  // === 🌍 EU / REGULATION / BIOFUELS ===
  { url: 'https://www.euractiv.com/section/agriculture-food/feed/', name: 'Euractiv Agri' },
  { url: 'https://ec.europa.eu/commission/presscorner/api/v1/rss?tag=Agriculture%20and%20Rural%20Development', name: 'EU Commission' },
  { url: 'https://www.transportenvironment.org/feed/', name: 'Transport & Environment' },
  { url: 'https://www.foodnavigator.com/rss', name: 'FoodNavigator' },
  { url: 'https://www.biofuelsdigest.com/feed/', name: 'Biofuels Digest' },
  
  // === 🇪🇺🇷🇺🇺🇦 BALKANS / CIS / TRADE ===
  { url: 'https://www.seenews.com/feed', name: 'SeeNews (Balkans)' },
  { url: 'https://www.balkaninsight.com/feed', name: 'Balkan Insight' },
  { url: 'https://www.zerno.ua/feed/', name: 'Zerno.ua' },
  { url: 'https://www.agrotimes.net/feed/', name: 'AgroTimes' },
  
  // === 💰 PRICES / MARKETS / COMMODITIES ===
  { url: 'https://www.barchart.com/news/rss', name: 'Barchart' },
  { url: 'https://www.reuters.com/business/sustainable-business/rss', name: 'Reuters ESG' },
  { url: 'https://www.investing.com/rss/news_106.rss', name: 'Investing.com Commodities' }
];

// 🔹 LEVEL 2: БЕЛЫЙ СПИСОК КОНТЕНТА (хотя бы одно из этих слов должно быть в статье)
const CONTENT_WHITELIST = [
  // === МАСЛА И МАСЛИЧНЫЕ ===
  'palm oil', 'crude palm', 'cpo', 'ffb', 'fresh fruit bunch', 'palm kernel', 'pko',
  'soybean oil', 'soy oil', 'soyoil', 'soybean meal', 'soybeans', 'soy complex',
  'sunflower oil', 'sunflower', 'sfo', 'sunflower seed', 'sunflower complex',
  'rapeseed oil', 'canola', 'rapeseed', 'rso', 'canola oil', 'rapeseed meal',
  'coconut oil', 'copra', 'cno',
  'vegetable oil', 'edible oil', 'oilseed', 'oilseeds', 'oil complex', 'oleochemical',
  
  // === БИОТОПЛИВО И РЕГУЛЯТОРИКА ===
  'biodiesel', 'biofuel', 'renewable fuel', 'saf', 'sustainable aviation fuel',
  'eudr', 'eu deforestation', 'deforestation regulation', 'due diligence',
  'red iii', 'renewable energy directive', 'red3', 'fit for 55',
  'rsppo', 'mspo', 'iscc', 'sustainable palm', 'certification', 'traceability',
  
  // === РЫНОК, ЦЕНЫ, ТОРГОВЛЯ ===
  'export duty', 'import tariff', 'reference price', 'cpo reference', 'ffb price',
  'crushing margin', 'trade flow', 'shipment', 'logistics', 'port clearance',
  'black sea', 'strait of malacca', 'rotterdam', 'hamburg', 'antwerp', 'gdańsk',
  'serbia', 'poland', 'bulgaria', 'romania', 'caucasus', 'central asia', 'balkans',
  'food industry', 'food safety', 'labeling regulation', 'ingredient sourcing',
  
  // === ПРОИЗВОДСТВО И ЦЕПОЧКИ ===
  'palm oil production', 'palm oil yield', 'palm oil stock', 'palm oil demand',
  'smallholder', 'plantation', 'mill', 'refinery', 'crushing', 'processing',
  'supply chain', 'traceability', 'sustainability report', 'esg reporting'
];

// 🔹 LEVEL 3: ЧЕРНЫЙ СПИСОК КОНТЕНТА (если есть любое из этих слов — статья удаляется)
const CONTENT_BLACKLIST = [
  // === СПОРТ / РАЗВЛЕЧЕНИЯ ===
  'chess', 'fide', 'kasparov', 'carlsen', 'grandmaster', 'tournament',
  'football', 'soccer', 'premier league', 'champions league',
  
  // === ПОЛИТИКА / ВОЙНЫ (не связанные с торговлей маслами) ===
  'trump iran', 'israel sanctions', 'gaza', 'hamas', 'hezbollah',
  'ukraine battlefield', 'russian troops', 'front line', 'artillery',
  'nato summit', 'fighter jet', 'defense spending', 'military aid',
  
  // === ЗДОРОВЬЕ / МЕДИЦИНА / РЕЦЕПТЫ ===
  'ebola', 'quarantine lab', 'pandemic response', 'vaccine',
  'shampoo', 'conditioner', 'skin care', 'hair care', 'beauty award',
  'weight loss', 'statin', 'cholesterol', 'heart health', 'diet tip',
  'recipe', 'chef', 'blue zone', 'bath product', 'mindful award', 'cooking',
  
  // === IT / КРИПТО / ФИНАНСЫ (не товарные) ===
  'crypto', 'bitcoin', 'ethereum', 'nft', 'web3', 'blockchain token',
  'air passenger rights', 'flight delay', 'wizz air complaint',
  'lgbt pride', 'family march', 'abortion law', 'migration pact',
  
  // === ОБЩЕЕ "ШУМОВОЕ" ===
  'person of the year', 'award ceremony', 'celebrity', 'influencer',
  'travel guide', 'tourism boom', 'hotel opening', 'restaurant review'
];

// ============================================================================
// 🔍 ФУНКЦИЯ ФИЛЬТРАЦИИ (3 уровня)
// ============================================================================

function passesFilters(news: NewsItem): boolean {
  const text = (news.title + ' ' + news.content).toLowerCase();
  
  // 🔹 LEVEL 2: Белый список (обязательно хотя бы одно совпадение)
  const hasWhitelist = CONTENT_WHITELIST.some(kw => text.includes(kw.toLowerCase()));
  if (!hasWhitelist) return false;
  
  // 🔹 LEVEL 3: Черный список (любое совпадение = отклонить)
  const hasBlacklist = CONTENT_BLACKLIST.some(kw => text.includes(kw.toLowerCase()));
  if (hasBlacklist) return false;
  
  return true; // Прошло оба фильтра
}

// ============================================================================
// 🚀 ОСНОВНОЙ ХЕНДЛЕР
// ============================================================================

export async function GET() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let allNews: NewsItem[] = [];

  // 🔹 LEVEL 1: Загрузка только из проверенных источников
  const fetches = VERIFIED_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRSS(xml, src.name);
    } catch (e) {
      console.warn(`⚠️ Skip ${src.name}:`, (e as Error).message);
      return [];
    }
  });

  const results = await Promise.all(fetches);
  for (const items of results) allNews.push(...items);

  console.log(`📥 [L1] Raw from ${VERIFIED_SOURCES.length} sources: ${allNews.length} items`);

  // 🔹 ФИЛЬТР ПО ДАТЕ (последние 7 дней)
  const recent = allNews.filter(n => new Date(n.published_date).getTime() >= weekAgo);
  console.log(`📅 [Date] After 7-day filter: ${recent.length} items`);

  // 🔹 LEVEL 2 + 3: Контентная фильтрация
  const filtered = recent.filter(passesFilters);
  console.log(`🎯 [L2+L3] After content filters: ${filtered.length} items`);

  // 🔹 ДЕДУПЛИКАЦИЯ (по заголовку + источнику)
  const seen = new Set<string>();
  const unique = filtered.filter(n => {
    const key = `${n.title.toLowerCase().trim()}|${n.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`🔁 [Dedupe] After deduplication: ${unique.length} items`);

  // 🔹 СОРТИРОВКА (сначала новые)
  unique.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

  const result = unique.slice(0, 35);
  console.log(`✅ [Final] Returning ${result.length} verified news items`);

  return NextResponse.json({
    news: result,
    meta: {
      strategy: '3-Tier Filter: Sources ✓ | Whitelist ✓ | Blacklist ✗',
      levels: {
        L1_sources: VERIFIED_SOURCES.length,
        L2_whitelist_keywords: CONTENT_WHITELIST.length,
        L3_blacklist_keywords: CONTENT_BLACKLIST.length
      },
      pipeline: {
        raw: allNews.length,
        afterDate: recent.length,
        afterContentFilters: filtered.length,
        afterDedupe: unique.length,
        returned: result.length
      },
      dateRange: {
        from: new Date(weekAgo).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      timestamp: new Date().toISOString()
    }
  });
}
