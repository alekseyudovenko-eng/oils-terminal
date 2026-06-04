import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Расширенный список источников
const SOURCES = [
  // --- PALM OIL ---
  { name: 'APK-Inform (RU)', url: 'https://www.apk-inform.com/ru/news/rss', lang: 'ru' },
  { name: 'MPOC (EN)', url: 'https://mpoc.org.my/feed/', lang: 'en' },
  { name: 'Google Palm (EN)', url: 'https://news.google.com/rss/search?q=palm+oil+market&hl=en-US&gl=US&ceid=US:en', lang: 'en' },
  
  // --- SOYBEAN & RAPESEED ---
  { name: 'World Grain (EN)', url: 'https://www.world-grain.com/rss/feed', lang: 'en' },
  { name: 'Google Soy/Rape (EN)', url: 'https://news.google.com/rss/search?q=soybean+oil+OR+rapeseed+oil+market&hl=en-US&gl=US&ceid=US:en', lang: 'en' },
  
  // --- SUNFLOWER ---
  { name: 'APK Sunflower (RU)', url: 'https://www.apk-inform.com/ru/news/rss', lang: 'ru' }, // APK часто пишет про подсолнечник
  { name: 'Google Sunflower (EN)', url: 'https://news.google.com/rss/search?q=sunflower+oil+export&hl=en-US&gl=US&ceid=US:en', lang: 'en' },

  // --- COCONUT ---
  { name: 'Google Coconut (EN)', url: 'https://news.google.com/rss/search?q=coconut+oil+market&hl=en-US&gl=US&ceid=US:en', lang: 'en' }
];

export async function GET() {
  let allNews: NewsItem[] = [];
  const seenTitles = new Set<string>();

  const promises = SOURCES.map(async (source) => {
    try {
      const res = await fetch(source.url, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      
      const text = await res.text();
      const feed = await parser.parseString(text);
      
      return (feed.items || []).map((item: any) => ({
        title: item.title?.trim() || "",
        url: item.link || "#",
        content: item.contentSnippet || item.summary || "",
        published_date: item.pubDate || new Date().toISOString(),
        source: source.name
      }));
    } catch (e) {
      return [];
    }
  });

  const results = await Promise.all(promises);

  results.flat().forEach(item => {
    if (!item.title || item.title.length < 10) return;
    const titleKey = item.title.toLowerCase();
    if (seenTitles.has(titleKey)) return;
    
    seenTitles.add(titleKey);
    allNews.push(item);
  });

  allNews.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

  return NextResponse.json({ news: allNews.slice(0, 30) });
}
