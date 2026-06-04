import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function GET() {
  // Проверка авторизации Vercel Cron
  const authHeader = process.env.CRON_SECRET;
  // В реальном проекте лучше проверять header, но для простоты опустим

  try {
    // Берем новости из нашего же API (или напрямую из RSS)
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://oils-terminal.vercel.app'}/api/news`);
    const data = await res.json();
    const top5 = data.news.slice(0, 5);

    let msg = "📰 <b>Morning News Digest</b>\n\n";
    top5.forEach((n: any, i: number) => {
      msg += `${i+1}. <a href="${n.url}">${n.title}</a>\n`;
    });
    msg += `\n<i>Source: Oils Terminal Aggregator</i>`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
