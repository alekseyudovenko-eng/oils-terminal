// /api/channel/poll-result?once=poll-2026-W45 — закрыть опрос недели в @oilpalm и вернуть итоги
// (для «Итогов недели» в пятницу). Итоги сохраняются: повторный вызов вернёт их же, даже если опрос уже закрыт.
// Доступ: CRON_SECRET (Authorization: Bearer … или ?key=…).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { callTelegramChat } from '@/lib/telegram';
import { channelChat } from '@/lib/channel';
import { getFreshDb as getDb } from '@/lib/db';
import { sentMessageId } from '@/lib/once-a-day';

export const dynamic = 'force-dynamic';

type Result = { question: string; total: number; options: { text: string; votes: number; pct: number }[] };

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const once = new URL(request.url).searchParams.get('once') || '';
  if (!/^poll-[a-z0-9-]{3,58}$/.test(once)) return NextResponse.json({ success: false, error: 'once must look like poll-2026-W45' }, { status: 400 });
  const db = getDb();
  const key = `_sent:pollres:${once}`;
  if (db) {
    const { data } = await db.from('price_snapshots').select('ticker').eq('series', key).limit(1).maybeSingle();
    if (data?.ticker) {
      try { return NextResponse.json({ success: true, once, cached: true, ...JSON.parse(String(data.ticker)) }); } catch { /* пересчитаем */ }
    }
  }
  const messageId = await sentMessageId(`post:${once}`);
  if (!messageId) return NextResponse.json({ success: false, error: 'poll not found (not posted or no message id)', once }, { status: 404 });
  const r = await callTelegramChat('stopPoll', channelChat(), { message_id: messageId });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error, once }, { status: 502 });
  const total = Number(r.result?.total_voter_count ?? 0);
  const res: Result = {
    question: r.result?.question ?? '',
    total,
    options: (r.result?.options ?? []).map((o: any) => ({
      text: o.text, votes: Number(o.voter_count ?? 0), pct: total ? Math.round((Number(o.voter_count ?? 0) / total) * 100) : 0,
    })),
  };
  if (db) {
    await db.from('price_snapshots').upsert(
      { day: new Date().toISOString().slice(0, 10), series: key, price: null, usd_t: null, ticker: JSON.stringify(res) },
      { onConflict: 'day,series' }
    );
  }
  return NextResponse.json({ success: true, once, cached: false, ...res });
}
