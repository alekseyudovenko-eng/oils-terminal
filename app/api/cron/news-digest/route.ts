// app/api/cron/news-digest/route.ts — новостной дайджест в Telegram.
// Шлёт только новости, добавленные после прошлой рассылки. Нет новых — ничего не отправляет.
// Запускается утренней задачей отбора новостей и (запасной вариант) Vercel Cron.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { caller, lastSentAt, markSentToday } from '@/lib/once-a-day';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { getAddedSince } from '@/lib/news';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://imaoils.vercel.app';
const MAX_ITEMS = 10;
const FIRST_RUN_WINDOW_H = 20; // если отметки о рассылке ещё нет — берём последние 20 часов (сегодняшний ручной дайджест не повторится)

export async function GET(request: Request) {
  const via = caller(request);
  if (!isCronAuthorized(request)) {
    console.warn('news-digest: unauthorized call from', via);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const last = await lastSentAt('news-digest');
  const since = last ?? new Date(Date.now() - FIRST_RUN_WINDOW_H * 3600_000);
  const fresh = getAddedSince(since);

  if (fresh.length === 0) {
    console.log('news-digest: no fresh news since', since.toISOString(), '; caller', via);
    return NextResponse.json({ success: true, skipped: 'no fresh news', since: since.toISOString() });
  }

  const news = fresh.slice(0, MAX_ITEMS);
  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  let message = `🌴 <b>Oils Terminal — новости</b>\n📅 ${today}\n\n`;
  for (const item of news) {
    const title = item.title.length > 120 ? item.title.slice(0, 117) + '…' : item.title;
    message += `🔹 <a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a>\n`;
    if (item.summary) {
      const s = item.summary.length > 220 ? item.summary.slice(0, 217) + '…' : item.summary;
      message += `${escapeHtml(s)}\n`;
    }
    message += `<i>${escapeHtml(item.source)}</i>\n\n`;
  }
  if (fresh.length > news.length) message += `…и ещё ${fresh.length - news.length} на сайте.\n\n`;
  message += `🔗 <a href="${escapeHtml(SITE_URL + '/market#news')}">Все новости и показатели</a>`;

  const sent = await sendTelegramMessage(message);
  if (sent) await markSentToday('news-digest', via);
  console.log('news-digest: sent =', sent, 'items', news.length, 'caller', via);
  return NextResponse.json({ success: sent, items: news.length }, { status: sent ? 200 : 502 });
}
