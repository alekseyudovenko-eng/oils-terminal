// lib/news.ts — новости рынка растительных масел за последние 30 дней.
import { unstable_cache } from 'next/cache';

export type Topic = 'palm' | 'soy' | 'sunflower' | 'rapeseed' | 'biofuel' | 'policy';

export type NewsItem = {
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  source: string;
  lang: 'ru' | 'en';
  topics: Topic[];
};

export const TOPIC_LABELS: Record<Topic, string> = {
  palm: 'Пальма',
  soy: 'Соя',
  sunflower: 'Подсолнечник',
  rapeseed: 'Рапс',
  biofuel: 'Биотопливо',
  policy: 'Регулирование',
};

const MAX_AGE_DAYS = 30;

type Feed = { url: string; name?: string; lang: 'ru' | 'en'; trusted?: boolean };

const gnews = (q: string, lang: 'ru' | 'en'): Feed => ({
  url: lang === 'ru'
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:30d')}&hl=ru&gl=RU&ceid=RU:ru`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:30d')}&hl=en-US&gl=US&ceid=US:en`,
  lang,
  trusted: true, // запрос уже тематический
});

const FEEDS: Feed[] = [
  { url: 'https://www.palmoilmagazine.com/feed/', name: 'Palm Oil Magazine', lang: 'en', trusted: true },
  { url: 'https://mpoc.org.my/feed/', name: 'MPOC', lang: 'en', trusted: true },
  { url: 'https://www.euractiv.com/section/agriculture-food/feed/', name: 'Euractiv', lang: 'en' },
  { url: 'https://www.world-grain.com/rss', name: 'World Grain', lang: 'en' },
  { url: 'https://www.agri-pulse.com/rss', name: 'Agri-Pulse', lang: 'en' },
  gnews('"palm oil" price OR export OR production', 'en'),
  gnews('"soybean oil" OR "soyoil" market', 'en'),
  gnews('"sunflower oil" OR "sunoil" export', 'en'),
  gnews('"rapeseed oil" OR canola oil market', 'en'),
  gnews('palm oil biodiesel OR EUDR', 'en'),
  gnews('пальмовое масло', 'ru'),
  gnews('подсолнечное масло экспорт', 'ru'),
  gnews('растительное масло рынок', 'ru'),
];

const TOPIC_RULES: [Topic, RegExp][] = [
  ['palm', /palm|cpo\b|olein|пальм/i],
  ['soy', /soy|соев|соя/i],
  ['sunflower', /sunflower|sunoil|подсолнеч/i],
  ['rapeseed', /rapeseed|canola|colza|рапс/i],
  ['biofuel', /biodiesel|biofuel|\bb40\b|\bb50\b|\bhvo\b|renewable diesel|биодизел|биотоплив/i],
  ['policy', /eudr|levy|export duty|tariff|quota|mandate|regulation|ban|пошлин|квот|запрет|регулир/i],
];

const BLACKLIST = /football|recipe|celebrity|shampoo|real estate|museum|рецепт|футбол|гороскоп/i;
const RELEVANT = /palm oil|cpo\b|olein|soybean oil|soyoil|sunflower oil|sunoil|rapeseed oil|canola oil|vegetable oil|edible oil|biodiesel|eudr|oilseed|пальмов|подсолнечн|растительн|соев\w* масл|рапсов\w* масл|масличн/i;

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', laquo: '«', raquo: '»',
  };
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

const stripCdata = (s: string) => s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
};
const clean = (s: string) => decodeEntities(decodeEntities(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    let title = clean(tag(block, 'title'));
    const url = clean(tag(block, 'link'));
    if (!title || !/^https?:\/\//.test(url)) continue;

    let source = feed.name || clean(tag(block, 'source'));
    // Google News добавляет « - Источник» в конец заголовка.
    if (!feed.name && source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    if (!source) source = new URL(url).hostname.replace(/^www\./, '');

    const rawDate = tag(block, 'pubDate') || tag(block, 'dc:date');
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) continue;

    let summary = clean(tag(block, 'description'));
    if (summary.startsWith(title)) summary = ''; // у Google News описание повторяет заголовок
    if (summary.length > 280) summary = summary.slice(0, 277).replace(/\s+\S*$/, '') + '…';

    const text = `${title} ${summary}`;
    items.push({
      title, url, summary, source, lang: feed.lang,
      publishedAt: date.toISOString(),
      topics: TOPIC_RULES.filter(([, re]) => re.test(text)).map(([t]) => t),
    });
    if (!feed.trusted && !RELEVANT.test(text)) items.pop();
  }
  return items;
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OilsTerminal/2.0; +https://oils-terminal.vercel.app)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), feed);
  } catch {
    return [];
  }
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 70);

async function loadNews(): Promise<NewsItem[]> {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400_000;
  const now = Date.now() + 3600_000; // допускаем расхождение часов
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();

  const seen = new Set<string>();
  const result = all
    .filter(n => {
      const t = new Date(n.publishedAt).getTime();
      return t >= cutoff && t <= now && !BLACKLIST.test(n.title) && RELEVANT.test(`${n.title} ${n.summary}`);
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter(n => {
      const key = normTitle(n.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (result.length === 0) throw new Error('Новости не получены ни из одного источника');
  return result.slice(0, 120);
}

const cachedNews = unstable_cache(loadNews, ['news-v2'], { revalidate: 1800 });

/** Новости за 30 дней, от свежих к старым. Кэш 30 минут. */
export async function getNews(): Promise<NewsItem[]> {
  try {
    return await cachedNews();
  } catch (e) {
    console.error('getNews:', e);
    return [];
  }
}

export async function getNewsFresh(): Promise<NewsItem[]> {
  try {
    return await loadNews();
  } catch {
    return [];
  }
}
