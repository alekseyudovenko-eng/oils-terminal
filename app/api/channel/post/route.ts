// /api/channel/post — публикация авторского поста (рубрики «Итоги недели», «Разбор MPOB», «Импорт в Россию»,
// «Мифы о пальмовом масле») в Telegram-канал. Тексты готовят задачи по расписанию по правилам docs/channel-rubrics.md.
// Доступ: CRON_SECRET (заголовок Authorization: Bearer … или ?key=…). Метод POST, тело JSON:
//   { "once": "weekly-2026-W44", "text": "<b>…</b>\n…", "photoUrl"?: "https://…", "preview"?: false, "dryRun"?: true }
// once — уникальный ключ поста: второй пост с тем же ключом не уйдёт (защита от дублей при повторах).
// dryRun — только проверка (разметка, длина, не было ли уже поста), без публикации.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentEver, caller, markSentToday } from '@/lib/once-a-day';
import { callTelegramChat } from '@/lib/telegram';
import { channelChat, checkTelegramHtml, visibleLength } from '@/lib/channel';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const via = caller(request);
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'body must be JSON' }, { status: 400 }); }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const once = typeof body?.once === 'string' ? body.once.trim() : '';
  const photoUrl = typeof body?.photoUrl === 'string' && /^https:\/\//.test(body.photoUrl) ? body.photoUrl : null;
  const preview = body?.preview === true;
  const dryRun = body?.dryRun === true;

  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(once)) {
    return NextResponse.json({ success: false, error: 'once: 3–64 chars, a-z 0-9 and "-", e.g. weekly-2026-W44' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ success: false, error: 'text is empty' }, { status: 400 });
  const htmlError = checkTelegramHtml(text);
  if (htmlError) return NextResponse.json({ success: false, error: htmlError }, { status: 400 });
  const chars = visibleLength(text);
  const limit = photoUrl ? 1024 : 4096;
  if (chars > limit) return NextResponse.json({ success: false, error: `text is ${chars} chars, limit ${limit}` }, { status: 400 });

  const chat = channelChat();
  const job = `post:${once}`;
  if (await alreadySentEver(job)) return NextResponse.json({ success: true, skipped: 'already posted', once, chat });
  if (dryRun) return NextResponse.json({ success: true, dryRun: true, once, chat, chars, limit });

  const r = photoUrl
    ? await callTelegramChat('sendPhoto', chat, { photo: photoUrl, caption: text, parse_mode: 'HTML' })
    : await callTelegramChat('sendMessage', chat, { text, parse_mode: 'HTML', link_preview_options: { is_disabled: !preview } });
  if (!r.ok) {
    console.error('channel/post error:', r.error, 'once', once, 'caller', via);
    return NextResponse.json({ success: false, error: r.error, once, chat }, { status: 502 });
  }
  await markSentToday(job, via);
  const messageId = r.result?.message_id ?? null;
  const url = chat.startsWith('@') && messageId ? `https://t.me/${chat.slice(1)}/${messageId}` : null;
  console.log('channel/post sent:', once, url, 'caller', via);
  return NextResponse.json({ success: true, once, chat, messageId, url });
}
