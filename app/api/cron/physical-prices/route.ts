// /api/cron/physical-prices — раз в рабочий день сохраняет физические цены пальмовых продуктов
// (zyotwdhon.com) в Supabase (physical_prices). Только для внутренних отчётов.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { fetchPhysical, PHYSICAL_SOURCE } from '@/lib/physical';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Supabase не настроен' }, { status: 500 });
  try {
    const { day, rows } = await fetchPhysical();
    const now = new Date().toISOString();
    const { error } = await db.from('physical_prices').upsert(
      rows.map(r => ({ day, ...r, source: PHYSICAL_SOURCE, fetched_at: now })),
      { onConflict: 'day,product,source' },
    );
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, day, rows: rows.length });
  } catch (e) {
    console.error('physical-prices:', e);
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 502 });
  }
}
