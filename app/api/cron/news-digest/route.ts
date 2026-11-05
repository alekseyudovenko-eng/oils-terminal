// app/api/cron/news-digest/route.ts — новостной дайджест в Telegram.
// Шлёт только новости, добавленные после прошлой рассылки. Нет новых — ничего не отправляет.
// Запускается утренней задачей отбора новостей и (запасной вариант) Vercel Cron.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { caller, lastSentAt, markSentToday } from '@/lib/once-a-day';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { htmlToVkText, postToVk, vkConfigured } from '@/lib/vk';
import { getAddedSince } from '@/lib/news';
import { MAX_POSTS_PER_DAY, channelPostsToday, isWeekendMsk } from '@/lib/channel-schedule';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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

  // Сетка канала: в выходные не публикуем; если сегодня уже 2 поста (Snapshot + рубрика/опрос),
  // дайджест пропускается, а новости уходят в следующий (он берёт всё, что добавлено после прошлой рассылки).
  if (isWeekendMsk()) return NextResponse.json({ success: true, skipped: 'weekend' });
  const postsToday = await channelPostsToday();
  if (postsToday >= MAX_POSTS_PER_DAY) {
    console.log('news-digest: daily limit reached (', postsToday, '), news roll over; caller', via);
    return NextResponse.json({ success: true, skipped: 'daily limit', postsToday });
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
  message += `🔗 <a href="${escapeHtml(SITE_URL + '/en/market#news')}">All news and market indicators</a>`;

  const sent = await sendTelegramMessage(message);
  if (sent) await markSentToday('news-digest', via);
  console.log('news-digest: sent =', sent, 'items', news.length, 'caller', via);
  // ВКонтакте: копия дайджеста, только если он ушёл в Telegram (тот же лимит и та же сетка)
  let vk = vkConfigured() ? 'skipped' : 'not configured';
  if (sent && vkConfigured()) {
    const v = await postToVk(htmlToVkText(message) + '\n📣 Telegram: https://t.me/oilpalm', { fallbackLink: SITE_URL + '/en/market#news' });
    vk = v.ok ? `posted ${v.url}` : `error: ${v.error}`;
    console.log('news-digest vk:', vk);
  }
  return NextResponse.json({ success: sent, items: news.length, vk }, { status: sent ? 200 : 502 });
}
