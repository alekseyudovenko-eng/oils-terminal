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

/** Название издания латиницей: русские названия и пояснения в скобках заменяем/убираем. */
const sourceEn = (s: string) =>
  s.replace(/УкрАгроКонсалт/g, 'UkrAgroConsult').replace(/Интерфакс/g, 'Interfax').replace(/ТАСС/g, 'TASS')
    .replace(/\s*\([^)]*[А-Яа-яЁё][^)]*\)/g, '').trim();
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
  // Дайджест на английском: основная аудитория канала англоязычная.
  // Если у новости нет английского текста, она идёт на языке оригинала:
  // русская — на русском (title + summary), англоязычная — с заголовком источника.
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  let message = `🌴 <b>Oils Terminal — Daily News</b>\n📅 ${today}\n\n`;
  for (const item of news) {
    const english = !!item.titleEn;
    const t = item.titleEn || (item.lang === 'en' && item.originalTitle) || item.title;
    const sum = english ? item.summaryEn : item.lang === 'ru' ? item.summary : undefined;
    const title = t.length > 120 ? t.slice(0, 117) + '…' : t;
    message += `🔹 <a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a>\n`;
    if (sum) {
      const s = sum.length > 220 ? sum.slice(0, 217) + '…' : sum;
      message += `${escapeHtml(s)}\n`;
    }
    message += `<i>${escapeHtml(item.titleEn ? sourceEn(item.source) : item.source)}</i>\n\n`;
  }
  if (fresh.length > news.length) message += `…and ${fresh.length - news.length} more on the website.\n\n`;
  message += `🔗 <a href="${escapeHtml(SITE_URL + '/market#news')}">All news and market indicators</a>`;

  const sent = await sendTelegramMessage(message);
  if (sent) await markSentToday('news-digest', via);
  console.log('news-digest: sent =', sent, 'items', news.length, 'caller', via);
  return NextResponse.json({ success: sent, items: news.length }, { status: sent ? 200 : 502 });
}
