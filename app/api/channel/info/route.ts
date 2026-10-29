// /api/channel/info — название и описание Telegram-канала (их учитывает поиск Telegram).
// GET — текущие данные канала (название, описание, подписчики, привязана ли группа обсуждения).
// POST { "title"?: "…", "description"?: "…" } — изменить. Боту нужно право администратора «Изменение профиля канала».
// Доступ: CRON_SECRET (Authorization: Bearer … или ?key=…).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { callTelegramChat } from '@/lib/telegram';
import { channelChat } from '@/lib/channel';

export const dynamic = 'force-dynamic';

async function info() {
  const chat = channelChat();
  const [c, n] = await Promise.all([callTelegramChat('getChat', chat), callTelegramChat('getChatMemberCount', chat)]);
  if (!c.ok) return { success: false, chat, error: c.error };
  const r = c.result || {};
  return {
    success: true, chat, title: r.title ?? null, description: r.description ?? null, username: r.username ?? null,
    subscribers: n.ok ? n.result : null, discussionGroupLinked: r.linked_chat_id != null,
  };
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const out = await info();
  return NextResponse.json(out, { status: out.success ? 200 : 502 });
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'body must be JSON' }, { status: 400 }); }
  const chat = channelChat();
  const errors: string[] = [];
  if (typeof body?.title === 'string') {
    const t = body.title.trim();
    if (!t || t.length > 128) errors.push('title: 1–128 chars');
    else { const r = await callTelegramChat('setChatTitle', chat, { title: t }); if (!r.ok) errors.push(`title: ${r.error}`); }
  }
  if (typeof body?.description === 'string') {
    const d = body.description.trim();
    if (d.length > 255) errors.push('description: up to 255 chars');
    else { const r = await callTelegramChat('setChatDescription', chat, { description: d }); if (!r.ok) errors.push(`description: ${r.error}`); }
  }
  const out = await info();
  return NextResponse.json({ ...out, success: errors.length === 0 && out.success, errors }, { status: errors.length ? 502 : 200 });
}
