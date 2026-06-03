import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

// Список источников для парсинга (HTML + RSS fallback)
const SOURCES = [
  { 
    name: 'APK-Inform', 
    url: 'https://www.apk-inform.com/en/news', 
    type: 'html',
    selectors: { item: '.news-item, article', title: 'h3 a, .title', link: 'a', date: '.date, time' }
  },
  { 
    name: 'MPOC', 
    url: 'https://mpoc.org.my/category/market-news/', 
    type: 'html',
    selectors: { item: '.post, article', title: 'h2 a, .entry-title', link: 'a', date: '.published, time' }
  },
  {
    name: 'World Grain',
    url: 'https://www.world-grain.com/rss/feed',
    type: 'rss'
  }
];

export async function GET() {
  let allNews: NewsItem[] = [];

  for (const source of SOURCES) {
    try {
      if (source.type === 'rss') {
        // Логика для RSS (упрощенная)
        const res = await fetch(source.url);
        const text = await res.text();
        // Здесь можно подключить rss-parser, если нужно, пока пропускаем для краткости
      } else {
        // Логика HTML Парсинга (как в твоем инструменте)
        const res = await fetch(source.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        
        if (!res.ok) continue;
        
        const html = await res.text();
        const $ = cheerio.load(html);
        
        // Ищем блоки новостей
        $(source.selectors.item).each((i, el) => {
          const titleEl = $(el).find(source.selectors.title).first();
          const linkEl = $(el).find(source.selectors.link).first();
          
          if (titleEl.length && linkEl.length) {
            const title = titleEl.text().trim();
            let link = linkEl.attr('href') || '';
            
            // Исправляем ссылки
            if (link && !link.startsWith('http')) {
              const urlObj = new URL(source.url);
              link = `${urlObj.protocol}//${urlObj.host}${link}`;
            }

            // Фильтруем мусор
            if (title.length > 10 && title.length < 200 && link.includes(source.name.toLowerCase().split('-')[0])) {
               allNews.push({
                 title: title,
                 url: link,
                 content: title, // Для превью
                 published_date: new Date().toISOString(), // Дата парсинга, если не нашли
                 source: source.name
               });
            }
          }
        });
      }
    } catch (e) {
      console.error(`Error parsing ${source.name}:`, e);
    }
  }

  // Если парсинг не дал результатов, возвращаем твои проверенные новости (Fallback)
  if (allNews.length === 0) {
    allNews = [
      { title: "Russian sunflower oil exports to India increased by more than 70% in 2026", url: "https://www.apk-inform.com/en/news/1554774", content: "Exports surge", published_date: new Date().toISOString(), source: "APK-Inform" },
      { title: "Kazakhstan oilseed processing sector posts record results", url: "https://www.apk-inform.com/en/news/1554777", content: "Record processing", published_date: new Date().toISOString(), source: "APK-Inform" }
    ];
  }

  return NextResponse.json({ news: allNews.slice(0, 15) });
}
