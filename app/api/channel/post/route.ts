// /api/channel/post — публикация авторского поста (рубрики «Итоги недели», «Разбор MPOB», «Импорт в Россию»,
// «Мифы о пальмовом масле») в Telegram-канал. Тексты готовят задачи по расписанию по правилам docs/channel-rubrics.md.
// Доступ: CRON_SECRET (заголовок Authorization: Bearer … или ?key=…). Метод POST, тело JSON:
//   { "once": "weekly-2026-W44", "text": "<b>…</b>\n…", "photoUrl"?: "https://…", "preview"?: false, "dryRun"?: true }
//   или опрос: { "once": "poll-2026-W45", "poll": { "question": "…", "options": ["…", "…"] }, "dryRun"?: true }
// once — уникальный ключ поста: второй пост с тем же ключом не уйдёт (защита от дублей при повторах).
// dryRun — только проверка (разметка, длина, не было ли уже поста, лимит дня), без публикации.
// Сетка канала (lib/channel-schedule.ts): не больше 2 постов в день, в выходные — ничего.
// Ответ {"skipped":"weekend"} или {"skipped":"daily limit"} — сегодня не публиковать, задача попробует в другой день.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentEver, caller, markSentWithId } from '@/lib/once-a-day';
import { MAX_POSTS_PER_DAY, channelPostsToday, isWeekendMsk } from '@/lib/channel-schedule';
import { callTelegramChat } from '@/lib/telegram';
import { channelChat, checkTelegramHtml, visibleLength } from '@/lib/channel';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const via = caller(request);
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'body must be JSON' }, { status: 400 }); }
  const poll = body?.poll && typeof body.poll === 'object' ? body.poll : null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const once = typeof body?.once === 'string' ? body.once.trim() : '';
  const photoUrl = typeof body?.photoUrl === 'string' && /^https:\/\//.test(body.photoUrl) ? body.photoUrl : null;
  const preview = body?.preview === true;
  const dryRun = body?.dryRun === true;

  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(once)) {
    return NextResponse.json({ success: false, error: 'once: 3–64 chars, a-z 0-9 and "-", e.g. weekly-2026-W44' }, { status: 400 });
  }
  let chars = 0, limit = 0;
  if (poll) {
    const q = typeof poll.question === 'string' ? poll.question.trim() : '';
    const opts: string[] = Array.isArray(poll.options) ? poll.options.map((o: unknown) => String(o).trim()).filter(Boolean) : [];
    if (!q || q.length > 300) return NextResponse.json({ success: false, error: 'poll.question: 1–300 chars' }, { status: 400 });
    if (opts.length < 2 || opts.length > 10 || opts.some(o => o.length > 100)) {
      return NextResponse.json({ success: false, error: 'poll.options: 2–10 options, each 1–100 chars' }, { status: 400 });
    }
    chars = q.length;
  } else {
    if (!text) return NextResponse.json({ success: false, error: 'text is empty' }, { status: 400 });
    const htmlError = checkTelegramHtml(text);
    if (htmlError) return NextResponse.json({ success: false, error: htmlError }, { status: 400 });
    chars = visibleLength(text);
    limit = photoUrl ? 1024 : 4096;
    if (chars > limit) return NextResponse.json({ success: false, error: `text is ${chars} chars, limit ${limit}` }, { status: 400 });
  }

  const chat = channelChat();
  const job = `post:${once}`;
  if (await alreadySentEver(job)) return NextResponse.json({ success: true, skipped: 'already posted', once, chat });
  if (isWeekendMsk()) return NextResponse.json({ success: true, skipped: 'weekend', once, chat });
  const postsToday = await channelPostsToday();
  if (postsToday >= MAX_POSTS_PER_DAY) {
    return NextResponse.json({ success: true, skipped: 'daily limit', postsToday, max: MAX_POSTS_PER_DAY, once, chat });
  }
  if (dryRun) return NextResponse.json({ success: true, dryRun: true, once, chat, chars, limit, postsToday });

  const r = poll
    ? await callTelegramChat('sendPoll', chat, {
        question: String(poll.question).trim(),
        options: poll.options.map((o: unknown) => ({ text: String(o).trim() })).filter((o: { text: string }) => o.text),
        is_anonymous: true,
      })
    : photoUrl
    ? await callTelegramChat('sendPhoto', chat, { photo: photoUrl, caption: text, parse_mode: 'HTML' })
    : await callTelegramChat('sendMessage', chat, { text, parse_mode: 'HTML', link_preview_options: { is_disabled: !preview } });
  if (!r.ok) {
    console.error('channel/post error:', r.error, 'once', once, 'caller', via);
    return NextResponse.json({ success: false, error: r.error, once, chat }, { status: 502 });
  }
  const messageId = r.result?.message_id ?? null;
  await markSentWithId(job, via, messageId);
  const url = chat.startsWith('@') && messageId ? `https://t.me/${chat.slice(1)}/${messageId}` : null;
  console.log('channel/post sent:', once, url, 'caller', via);
  return NextResponse.json({ success: true, once, chat, messageId, url });
}
