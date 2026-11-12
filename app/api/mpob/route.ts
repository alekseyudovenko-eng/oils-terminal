// /api/mpob — запись публичных месячных цифр MPOB для карточки на главной.
// POST, доступ: CRON_SECRET (Authorization: Bearer … или ?key=…). Тело JSON:
// { "month": "2026-10", "stocks_t": 3620000, "production_t": 2150000, "exports_t": 1700000,
//   "stocks_mom_pct": 3.15, "production_mom_pct": 1.74, "exports_mom_pct": 55.75,
//   "stocks_yoy_pct"?: …, "released_on": "2026-11-10", "source_url": "https://…" }
// Только цифры из публичного релиза MPOB (пресс-релиз или СМИ со ссылкой на MPOB).
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isCronAuthorized } from '@/lib/auth';
import { getFreshDb as getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NUMS = ['stocks_t', 'production_t', 'exports_t', 'stocks_mom_pct', 'production_mom_pct', 'exports_mom_pct', 'stocks_yoy_pct', 'production_yoy_pct', 'exports_yoy_pct'] as const;

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ success: false, error: 'body must be JSON' }, { status: 400 }); }
  if (!/^\d{4}-\d{2}$/.test(String(b?.month || ''))) return NextResponse.json({ success: false, error: 'month: YYYY-MM' }, { status: 400 });
  if (!/^https:\/\//.test(String(b?.source_url || ''))) return NextResponse.json({ success: false, error: 'source_url required' }, { status: 400 });
  const row: Record<string, unknown> = { month: `${b.month}-01`, source_url: b.source_url, released_on: b.released_on || null, note: b.note || null, updated_at: new Date().toISOString() };
  for (const k of NUMS) row[k] = b[k] == null || b[k] === '' ? null : Number(b[k]);
  if (row.stocks_t == null || row.production_t == null || row.exports_t == null) return NextResponse.json({ success: false, error: 'stocks_t, production_t, exports_t required' }, { status: 400 });
  const db = getDb();
  if (!db) return NextResponse.json({ success: false, error: 'no database' }, { status: 500 });
  const { error } = await db.from('mpob_monthly_public').upsert(row, { onConflict: 'month' });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  revalidateTag('mpob-public');
  return NextResponse.json({ success: true, month: b.month });
}
