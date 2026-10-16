// app/api/cron/news-digest/route.ts — новостной дайджест в Telegram (Vercel Cron).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { getNewsFresh } from '@/lib/news';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://oils-terminal.vercel.app';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Только за последние сутки; если их мало — за 3 дня.
  const all = await getNewsFresh();
  const since = (h: number) => all.filter(n => Date.now() - new Date(n.publishedAt).getTime() < h * 3600_000);
  let news = since(24);
  if (news.length < 5) news = since(72);
  news = news.slice(0, 10);

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  let message = `🌴 <b>Oils Terminal — новости</b>\n📅 ${today}\n\n`;

  if (news.length === 0) {
    message += 'За последние три дня новостей не найдено.\n\n';
  } else {
    for (const item of news) {
      const title = item.title.length > 120 ? item.title.slice(0, 117) + '…' : item.title;
      message += `🔹 <a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a>\n   <i>${escapeHtml(item.source)}</i>\n\n`;
    }
  }
  message += `🔗 <a href="${escapeHtml(SITE_URL + '/market')}">Все новости и показатели</a>`;

  const sent = await sendTelegramMessage(message);
  return NextResponse.json({ success: sent, items: news.length }, { status: sent ? 200 : 502 });
}
