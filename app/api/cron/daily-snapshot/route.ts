// /api/cron/daily-snapshot — публикует картинку «IMA Daily Snapshot» в Telegram-канал, на страницу Facebook, в X и ВКонтакте.
// Запускается Vercel Cron (см. vercel.json: основной запуск около 8:00 МСК и повтор через час на случай сбоя котировок).
// Ручной запуск: ?key=<CRON_SECRET>. Каждый канал публикуется один раз в день (своя отметка);
// ?force=1 — повторно (даст дубль!).
// Telegram: TELEGRAM_SNAPSHOT_CHAT_ID или '@oilpalm'. Facebook: см. lib/facebook.ts (Graph API или Metricool API).
// X: через Metricool, если METRICOOL_X=1 (аккаунт X должен быть подключён к бренду в Metricool).
// ВКонтакте (https://vk.ru/public156172373): если задан VK_GROUP_TOKEN (см. lib/vk.ts).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentToday, caller, markSentToday } from '@/lib/once-a-day';
import { isWeekendMsk } from '@/lib/channel-schedule';
import { escapeHtml, sendTelegramPhotoFile } from '@/lib/telegram';
import { facebookConfigured, postFacebookPhoto, postXPhoto, xConfigured } from '@/lib/facebook';
import { renderSnapshot } from '@/lib/snapshot';
import { channelChat } from '@/lib/channel';
import { postToVk, vkConfigured } from '@/lib/vk';

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
  // Сетка канала: в выходные биржи закрыты, снимок не публикуется (ни в Telegram, ни в Facebook).
  if (!force && isWeekendMsk()) return NextResponse.json({ success: true, skipped: 'weekend' });
  const fbOn = facebookConfigured();
  const tgDone = !force && (await alreadySentToday('daily-snapshot'));
  const fbDone = !fbOn || (!force && (await alreadySentToday('daily-snapshot-fb')));
  const xOn = xConfigured();
  const xDone = !xOn || (!force && (await alreadySentToday('daily-snapshot-x')));
  const vkOn = vkConfigured();
  const vkDone = !vkOn || (!force && (await alreadySentToday('daily-snapshot-vk')));
  if (tgDone && fbDone && xDone && vkDone) {
    return NextResponse.json({
      success: true, skipped: 'already sent today',
      facebook: fbOn ? 'already sent today' : 'not configured', x: xOn ? 'already sent today' : 'not configured',
      vk: vkOn ? 'already sent today' : 'not configured',
    });
  }

  const now = new Date();
  const { image, ok, title, titleRu, leadRu, newsRu } = await renderSnapshot(now);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'quotes unavailable (FCPO, Brent or USD/MYR)' }, { status: 502 });
  }
  const png = await image.arrayBuffer();
  const date = now.toISOString().slice(0, 10);
  const chat = channelChat();
  const [yy, mm, dd] = date.split('-');
  const dateRu = `${dd}.${mm}.${yy}`;

  // Telegram
  let tg: { ok: boolean; error?: string; skipped?: boolean } = { ok: true, skipped: true };
  if (!tgDone) {
    // Подпись по-русски: заголовок, две строки вывода, главные новости (картинка остаётся английской).
    const top = newsRu.slice(0, 3).map(t => `• ${escapeHtml(t)}`);
    let caption =
      `<b>IMA Daily Snapshot · ${dateRu}</b>\n<b>${escapeHtml(titleRu)}</b>\n\n` +
      leadRu.map(escapeHtml).join('\n') +
      (top.length ? `\n\n📰 <b>Главное</b>\n${top.join('\n')}` : '') +
      `\n\n<a href="${SITE_URL}">imaoils.vercel.app</a> — цены и новости рынка растительных масел`;
    if (caption.length > 1024) caption = caption.replace(/\n\n📰[\s\S]*?(?=\n\n<a )/, ''); // лимит подписи Telegram
    tg = await sendTelegramPhotoFile(png, `IMA_Daily_Snapshot_${date}.png`, caption, chat);
    if (tg.ok) await markSentToday('daily-snapshot', via);
    console.log('daily-snapshot telegram:', tg.ok ? 'sent' : tg.error, 'chat', chat, 'caller', via);
  }

  // Facebook (публикуется независимо от результата Telegram)
  let facebook: string = fbOn ? 'already sent today' : 'not configured';
  let fbOk = true;
  if (!fbDone) {
    const text =
      `IMA Daily Snapshot · ${dateRu}\n${titleRu}\n\n${leadRu.join('\n')}\n\n` +
      `Цены на пальмовое масло (FCPO), нефть Brent/WTI, курс USD/MYR и главные новости рынка растительных масел.\n\n` +
      `🔗 ${SITE_URL}`;
    const fb = await postFacebookPhoto(png, `${SITE_URL}/api/snapshot?d=${date}`, text);
    fbOk = fb.ok;
    facebook = fb.ok ? `posted via ${fb.via}` : `error (${fb.via}): ${fb.error}`;
    if (fb.ok) await markSentToday('daily-snapshot-fb', via);
    console.log('daily-snapshot facebook:', facebook, 'caller', via);
  }

  // X (Twitter) через Metricool — тоже независимо от остальных каналов
  let x: string = xOn ? 'already sent today' : 'not configured';
  let xOk = true;
  if (!xDone) {
    const [y, m, d] = date.split('-');
    const text =
      `IMA Daily Snapshot · ${d}.${m}.${y}\n${title}\n\n` +
      `Palm oil (FCPO), Brent/WTI, USD/MYR and top vegetable oil market news.\n\n` +
      `#palmoil #vegoils\n${SITE_URL}`;
    const r = await postXPhoto(`${SITE_URL}/api/snapshot?d=${date}`, text);
    xOk = r.ok;
    x = r.ok ? `posted via ${r.via}` : `error (${r.via}): ${r.error}`;
    if (r.ok) await markSentToday('daily-snapshot-x', via);
    console.log('daily-snapshot x:', x, 'caller', via);
  }

  // ВКонтакте — тоже независимо; подпись как в Telegram, но обычным текстом
  let vk: string = vkOn ? 'already sent today' : 'not configured';
  let vkOk = true;
  if (!vkDone) {
    const top = newsRu.slice(0, 3).map(t => `• ${t}`);
    const text =
      `IMA Daily Snapshot · ${dateRu}\n${titleRu}\n\n${leadRu.join('\n')}` +
      (top.length ? `\n\n📰 Главное\n${top.join('\n')}` : '') +
      `\n\n🔗 ${SITE_URL} — цены и новости рынка растительных масел\n📣 Telegram: https://t.me/oilpalm\n\n#пальмовоемасло #растительныемасла`;
    const r = await postToVk(text, { png, filename: `IMA_Daily_Snapshot_${date}.png`, fallbackLink: `${SITE_URL}/snapshot/${date}` });
    vkOk = r.ok;
    vk = r.ok ? `posted ${r.url}${r.photo ? '' : ' (без картинки' + (r.error ? ': ' + r.error : '') + ')'}` : `error: ${r.error}`;
    if (r.ok) await markSentToday('daily-snapshot-vk', via);
    console.log('daily-snapshot vk:', vk, 'caller', via);
  }

  const success = tg.ok && fbOk && xOk && vkOk;
  return NextResponse.json(
    {
      success, chat, title, titleRu, leadRu, telegram: tg.skipped ? 'already sent today' : tg.ok ? 'sent' : tg.error, facebook, x, vk,
      error: !tg.ok ? tg.error : !fbOk ? facebook : !xOk ? x : !vkOk ? vk : undefined,
    },
    { status: success ? 200 : 502 }
  );
}
