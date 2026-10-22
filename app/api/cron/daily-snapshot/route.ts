// /api/cron/daily-snapshot — публикует картинку «IMA Daily Snapshot» в Telegram-канал.
// Запускается задачей по расписанию (8:00 МСК) с ?key=<CRON_SECRET>&via=snapshot-task.
// Канал: TELEGRAM_SNAPSHOT_CHAT_ID или '@oilpalm'. Один раз в день; ?force=1 — повторно.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentToday, caller, markSentToday } from '@/lib/once-a-day';
import { escapeHtml, sendTelegramPhotoFile } from '@/lib/telegram';
import { renderSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SITE_URL = process.env.SITE_URL || 'https://imaoils.vercel.app';

export async function GET(request: Request) {
  const via = caller(request);
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const force = params.get('force') === '1';
  if (!force && (await alreadySentToday('daily-snapshot'))) {
    return NextResponse.json({ success: true, skipped: 'already sent today' });
  }

  const now = new Date();
  const { image, ok, title } = await renderSnapshot(now);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'quotes unavailable (FCPO, Brent or USD/MYR)' }, { status: 502 });
  }
  const png = await image.arrayBuffer();
  const date = now.toISOString().slice(0, 10);
  const chat = (process.env.TELEGRAM_SNAPSHOT_CHAT_ID || '@oilpalm').trim();
  const caption = `<b>IMA Daily Snapshot · ${date}</b>\n${escapeHtml(title)}\n\n<a href="${SITE_URL}">imaoils.vercel.app</a>`;
  const r = await sendTelegramPhotoFile(png, `IMA_Daily_Snapshot_${date}.png`, caption, chat);
  if (r.ok) await markSentToday('daily-snapshot', via);
  console.log('daily-snapshot:', r.ok ? 'sent' : r.error, 'chat', chat, 'caller', via);
  return NextResponse.json({ success: r.ok, chat, title, error: r.error }, { status: r.ok ? 200 : 502 });
}
