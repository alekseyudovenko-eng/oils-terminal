// /api/cron/daily-snapshot — публикует картинку «IMA Daily Snapshot» в Telegram-канал и на страницу Facebook.
// Запускается Vercel Cron (см. vercel.json: основной запуск около 8:00 МСК и повтор через час на случай сбоя котировок).
// Ручной запуск: ?key=<CRON_SECRET>. Каждый канал публикуется один раз в день (своя отметка);
// ?force=1 — повторно (даст дубль!).
// Telegram: TELEGRAM_SNAPSHOT_CHAT_ID или '@oilpalm'. Facebook: см. lib/facebook.ts (Graph API или Metricool API).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentToday, caller, markSentToday } from '@/lib/once-a-day';
import { escapeHtml, sendTelegramPhotoFile } from '@/lib/telegram';
import { facebookConfigured, postFacebookPhoto } from '@/lib/facebook';
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
  const fbOn = facebookConfigured();
  const tgDone = !force && (await alreadySentToday('daily-snapshot'));
  const fbDone = !fbOn || (!force && (await alreadySentToday('daily-snapshot-fb')));
  if (tgDone && fbDone) {
    return NextResponse.json({ success: true, skipped: 'already sent today', facebook: fbOn ? 'already sent today' : 'not configured' });
  }

  const now = new Date();
  const { image, ok, title } = await renderSnapshot(now);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'quotes unavailable (FCPO, Brent or USD/MYR)' }, { status: 502 });
  }
  const png = await image.arrayBuffer();
  const date = now.toISOString().slice(0, 10);
  const chat = (process.env.TELEGRAM_SNAPSHOT_CHAT_ID || '@oilpalm').trim();

  // Telegram
  let tg: { ok: boolean; error?: string; skipped?: boolean } = { ok: true, skipped: true };
  if (!tgDone) {
    const caption = `<b>IMA Daily Snapshot · ${date}</b>\n${escapeHtml(title)}\n\n<a href="${SITE_URL}">imaoils.vercel.app</a>`;
    tg = await sendTelegramPhotoFile(png, `IMA_Daily_Snapshot_${date}.png`, caption, chat);
    if (tg.ok) await markSentToday('daily-snapshot', via);
    console.log('daily-snapshot telegram:', tg.ok ? 'sent' : tg.error, 'chat', chat, 'caller', via);
  }

  // Facebook (публикуется независимо от результата Telegram)
  let facebook: string = fbOn ? 'already sent today' : 'not configured';
  let fbOk = true;
  if (!fbDone) {
    const [y, m, d] = date.split('-');
    const text =
      `IMA Daily Snapshot · ${d}.${m}.${y}\n${title}\n\n` +
      `Цены на пальмовое масло (FCPO), нефть Brent/WTI, курс USD/MYR и главные новости рынка растительных масел.\n\n` +
      `🔗 ${SITE_URL}`;
    const fb = await postFacebookPhoto(png, `${SITE_URL}/api/snapshot?d=${date}`, text);
    fbOk = fb.ok;
    facebook = fb.ok ? `posted via ${fb.via}` : `error (${fb.via}): ${fb.error}`;
    if (fb.ok) await markSentToday('daily-snapshot-fb', via);
    console.log('daily-snapshot facebook:', facebook, 'caller', via);
  }

  const success = tg.ok && fbOk;
  return NextResponse.json(
    { success, chat, title, telegram: tg.skipped ? 'already sent today' : tg.ok ? 'sent' : tg.error, facebook, error: tg.ok ? (fbOk ? undefined : facebook) : tg.error },
    { status: success ? 200 : 502 }
  );
}
