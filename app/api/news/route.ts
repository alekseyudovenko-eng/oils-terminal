// app/api/news/route.ts
import { NextResponse } from 'next/server';
import { fetchFilteredNews } from '@/lib/news-parser'; // ← ИМПОРТ

export async function GET() {
  const news = await fetchFilteredNews(35); // ← ИСПОЛЬЗУЕМ
  return NextResponse.json({
    news,
    meta: { timestamp: new Date().toISOString() }
  });
}


interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
  image?: string;
}

function decodeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&#8216;': "'", '&#8217;': "'", '&#8220;': '"', '&#8221;': '"',
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&rsquo;': "'", '&lsquo;': "'"
  };
  return text.replace(/&[#a-z0-9]+;/gi, m => map[m.toLowerCase()] || m);
}

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
// 🔰 ТРИ УРОВНЯ ФИЛЬТРАЦИИ (УЛУЧШЕННАЯ ВЕРСИЯ)
// ============================================================================

// 🔹 LEVEL 1: ПРОВЕРЕННЫЕ ИСТОЧНИКИ (убраны источники с общим новостным потоком)
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
  
  // === 🇪🇺🇷🇺🇺🇦 CIS / TRADE (только агро-фокус) ===
  { url: 'https://www.zerno.ua/feed/', name: 'Zerno.ua' },
  { url: 'https://www.agrotimes.net/feed/', name: 'AgroTimes' },
  { url: 'https://www.seenews.com/agriculture/feed', name: 'SeeNews Agriculture' }, // Только агро-раздел
  
  // === 💰 PRICES / MARKETS / COMMODITIES ===
  { url: 'https://www.barchart.com/news/rss', name: 'Barchart' },
  { url: 'https://www.reuters.com/business/sustainable-business/rss', name: 'Reuters ESG' },
  { url: 'https://www.investing.com/rss/news_106.rss', name: 'Investing.com Commodities' }
];

// 🔹 LEVEL 2: БЕЛЫЙ СПИСОК (разделён на категории для контекстной проверки)
const WHITELIST_CORE = [
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
  'food industry', 'food safety', 'labeling regulation', 'ingredient sourcing',
  
  // === ПРОИЗВОДСТВО ===
  'palm oil production', 'palm oil yield', 'palm oil stock', 'palm oil demand',
  'smallholder', 'plantation', 'mill', 'refinery', 'crushing', 'processing',
  'supply chain', 'esg reporting', 'sustainability report'
];

// Региональные слова (требуют подтверждения через WHITELIST_CORE)
const WHITELIST_REGIONAL = [
  'serbia', 'poland', 'bulgaria', 'romania', 'caucasus', 'central asia', 'balkans',
  'ukraine', 'russia', 'indonesia', 'malaysia', 'european union', 'eu market'
];

// 🔹 LEVEL 3: ЧЕРНЫЙ СПИСОК (расширен)
const BLACKLIST = [
  // === ПОЛИТИКА / ВОЙНЫ ===
  'police', 'arrest', 'prosecutor', 'court ruling', 'trial', 'investigation',
  'shooting', 'killing', 'murder', 'violence', 'protest', 'demonstration',
  'nato summit', 'fighter jet', 'defense spending', 'military aid', 'troops',
  'war crime', 'genocide', 'sanctions package', 'diplomatic row',
  
  // === ОБЩЕСТВО / КУЛЬТУРА ===
  'exhibition', 'museum', 'art gallery', 'cultural heritage', 'festival',
  'youth skills', 'media literacy', 'fake news', 'online fakes', 'disinformation',
  'lgbt', 'pride parade', 'abortion', 'migration pact', 'asylum seeker',
  
  // === ЭКОНОМИКА НЕ ПО ТЕМЕ ===
  'gold mine', 'copper mine', 'mining sector', 'precious metal',
  'real estate', 'property development', 'coastal development', 'illegal estate',
  'banking scandal', 'fraud case', 'confiscation order', 'boiler-room',
  
  // === ЗДОРОВЬЕ / ЛАЙФСТАЙЛ ===
  'recipe', 'chef', 'cooking', 'restaurant', 'diet tip', 'weight loss',
  'shampoo', 'conditioner', 'skin care', 'hair care', 'beauty award',
  'statin', 'cholesterol', 'heart health', 'pandemic', 'vaccine',
  
  // === СПОРТ / РАЗВЛЕЧЕНИЯ ===
  'chess', 'fide', 'football', 'soccer', 'premier league', 'tournament',
  'celebrity', 'influencer', 'person of the year', 'award ceremony'
];

// ============================================================================
// 🔍 УЛУЧШЕННАЯ ФУНКЦИЯ ФИЛЬТРАЦИИ
// ============================================================================

function passesFilters(news: NewsItem): boolean {
  const text = (news.title + ' ' + news.content).toLowerCase();
  
  // 🔹 LEVEL 3: Черный список (проверяем первым — быстрый отсев)
  if (BLACKLIST.some(kw => text.includes(kw.toLowerCase()))) {
    return false;
  }
  
  // 🔹 LEVEL 2: Белый список
  const hasCore = WHITELIST_CORE.some(kw => text.includes(kw.toLowerCase()));
  const hasRegional = WHITELIST_REGIONAL.some(kw => text.includes(kw.toLowerCase()));
  
  // Если есть только региональное слово, но нет ядра (масла/рынок) — отклоняем
  if (hasRegional && !hasCore) {
    return false;
  }
  
  // Если есть ядро — пропускаем (регион не обязателен)
  if (hasCore) {
    return true;
  }
  
  // Если нет ни ядра, ни региона — отклоняем
  return false;
}

// ============================================================================
// 🚀 ОСНОВНОЙ ХЕНДЛЕР
// ============================================================================

export async function GET() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let allNews: NewsItem[] = [];

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

  console.log(`📥 [L1] Raw: ${allNews.length} from ${VERIFIED_SOURCES.length} sources`);

  // 🔹 ФИЛЬТР ПО ДАТЕ
  const recent = allNews.filter(n => new Date(n.published_date).getTime() >= weekAgo);
  console.log(`📅 [Date] After 7-day: ${recent.length}`);

  // 🔹 LEVEL 2 + 3: Контекстная фильтрация
  const filtered = recent.filter(passesFilters);
  console.log(`🎯 [L2+L3] After content: ${filtered.length}`);

  // 🔹 ДЕДУПЛИКАЦИЯ
  const seen = new Set<string>();
  const unique = filtered.filter(n => {
    const key = `${n.title.toLowerCase().trim()}|${n.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 🔹 СОРТИРОВКА
  unique.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

  const result = unique.slice(0, 35);
  console.log(`✅ [Final] Returning ${result.length} items`);

  return NextResponse.json({
    news: result,
    meta: {
      strategy: '3-Tier Filter v2: Sources ✓ | Contextual Whitelist ✓ | Expanded Blacklist ✗',
      pipeline: {
        raw: allNews.length,
        afterDate: recent.length,
        afterContent: filtered.length,
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
