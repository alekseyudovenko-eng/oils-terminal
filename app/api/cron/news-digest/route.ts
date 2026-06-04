import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Те же источники, что и в основном API
const SOURCES = [
  { name: 'APK-Inform', url: 'https://www.apk-inform.com/ru/news/rss' },
  { name: 'MPOC', url: 'https://mpoc.org.my/feed/' },
  { name: 'Google News Palm', url: 'https://news.google.com/rss/search?q=palm+oil+market&hl=en-US&gl=US&ceid=US:en' }
];

export async function GET() {
  try {
    let allNews = [];
    
    // Параллельный сбор новостей
    const promises = SOURCES.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        return (feed.items || []).map((item: any) => ({
          title: item.title,
          url: item.link,
          source: source.name
        }));
      } catch (e) { return []; }
    });

    const results = await Promise.all(promises);
    allNews = results.flat().slice(0, 5); // Берем топ-5 свежих

    if (allNews.length === 0) {
      return NextResponse.json({ message: 'No news found' });
    }

    let msg = "📰 <b>Morning News Digest</b>\n\n";
    allNews.forEach((n: any, i: number) => {
      const title = n.title.length > 100 ? n.title.substring(0, 97) + '...' : n.title;
      msg += `${i+1}. <a href="${n.url}">${title}</a>\n`;
    });
    msg += `\n<i>Source: Oils Terminal Aggregator</i>`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: msg, 
        parse_mode: 'HTML', 
        disable_web_page_preview: true 
      })
    });

    return NextResponse.json({ success: true, sent: allNews.length });
  } catch (e) {
    console.error("Cron News Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
