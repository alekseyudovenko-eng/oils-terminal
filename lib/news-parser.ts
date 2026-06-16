// lib/news-parser.ts
export interface NewsItem {
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

export function parseRSS(xml: string, sourceName: string): NewsItem[] {
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

// === ФИЛЬТРЫ (сократи при необходимости) ===
const BLACKLIST = ['police', 'arrest', 'shooting', 'war', 'football', 'recipe', 'museum', 'festival', 'lgbt', 'abortion', 'gold mine', 'real estate', 'shampoo', 'chess', 'celebrity'];
const WHITELIST_CORE = ['palm oil', 'cpo', 'biodiesel', 'eudr', 'soybean', 'sunflower oil', 'rapeseed', 'biofuel', 'deforestation', 'export duty', 'crushing margin', 'sustainable palm'];

export function passesFilters(news: NewsItem): boolean {
  const text = (news.title + ' ' + news.content).toLowerCase();
  if (BLACKLIST.some(kw => text.includes(kw.toLowerCase()))) return false;
  return WHITELIST_CORE.some(kw => text.includes(kw.toLowerCase()));
}

// === ГЛАВНАЯ ФУНКЦИЯ ===
export async function fetchFilteredNews(limit: number = 10) {
  const VERIFIED_SOURCES = [
    { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palmoil Magazine' },
    { url: 'https://mpoc.org.my/feed/', name: 'MPOC' },
    { url: 'https://www.agri-pulse.com/rss', name: 'Agri-Pulse' },
    { url: 'https://www.euractiv.com/section/agriculture-food/feed/', name: 'Euractiv' },
    { url: 'https://www.world-grain.com/rss', name: 'World-Grain' }
  ];
  
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let allNews: NewsItem[] = [];

  const fetches = VERIFIED_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (OilsTerminal/1.0)' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRSS(xml, src.name);
    } catch { return []; }
  });

  const results = await Promise.all(fetches);
  for (const items of results) allNews.push(...items);

  const filtered = allNews.filter(n => 
    new Date(n.published_date).getTime() >= weekAgo && passesFilters(n)
  );

  const seen = new Set<string>();
  const unique = filtered.filter(n => {
    const key = `${n.title.toLowerCase().trim()}|${n.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
  return unique.slice(0, limit);
}
