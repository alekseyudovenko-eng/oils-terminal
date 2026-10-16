// app/api/cron/news-digest/route.ts — новостной дайджест в Telegram (Vercel Cron).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { getRecentlyAdded } from '@/lib/news';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://imaoils.vercel.app';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Новости, которые ежедневный отбор добавил за последние сутки (с запасом на задержку деплоя).
  const news = getRecentlyAdded(26).slice(0, 8);

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  let message = `🌴 <b>Oils Terminal — новости</b>\n📅 ${today}\n\n`;

  if (news.length === 0) {
    message += 'За сутки новых проверенных новостей не добавлено.\n\n';
  } else {
    for (const item of news) {
      const title = item.title.length > 120 ? item.title.slice(0, 117) + '…' : item.title;
      message += `🔹 <a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a>\n`;
      if (item.summary) message += `${escapeHtml(item.summary.length > 220 ? item.summary.slice(0, 217) + '…' : item.summary)}\n`;
      message += `<i>${escapeHtml(item.source)}</i>\n\n`;
    }
  }
  message += `🔗 <a href="${escapeHtml(SITE_URL + '/market')}">Все новости и показатели</a>`;

  const sent = await sendTelegramMessage(message);
  return NextResponse.json({ success: sent, items: news.length }, { status: sent ? 200 : 502 });
}
