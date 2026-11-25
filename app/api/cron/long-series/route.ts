// /api/cron/long-series — длинные ряды мировых цен для графиков: FRED (World Bank Pink Sheet), месячные.
// Сейчас: PPOILUSDM — мировая цена пальмового масла, USD/т (https://fred.stlouisfed.org/series/PPOILUSDM).
// Пишет в price_history (series = 'fred_palm', day = первое число месяца). Запуск раз в месяц (vercel.json) или вручную ?key=<CRON_SECRET>.
// FAO Vegetable Oil Price Index: файл на fao.org меняет имя при каждом релизе, поэтому автозагрузка пока не включена (см. README, раздел «Источники»).
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isCronAuthorized } from '@/lib/auth';
import { getFreshDb as getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SERIES: { id: string; fred: string }[] = [{ id: 'fred_palm', fred: 'PPOILUSDM' }];

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ success: false, error: 'no database' }, { status: 500 });
  const report: Record<string, string> = {};
  for (const s of SERIES) {
    try {
      const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.fred}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!res.ok) { report[s.id] = `HTTP ${res.status}`; continue; }
      const rows = (await res.text()).trim().split('\n').slice(1)
        .map(l => l.split(','))
        .filter(c => /^\d{4}-\d{2}-\d{2}$/.test(c[0]) && c[1] && !isNaN(Number(c[1])))
        .map(c => ({ series: s.id, day: c[0], close: Number(c[1]), source: `fred:${s.fred}`, updated_at: new Date().toISOString() }));
      if (rows.length < 12) { report[s.id] = `too few rows (${rows.length})`; continue; }
      for (let i = 0; i < rows.length; i += 1000) {
        const { error } = await db.from('price_history').upsert(rows.slice(i, i + 1000), { onConflict: 'series,day' });
        if (error) { report[s.id] = `db error: ${error.message}`; break; }
      }
      report[s.id] ??= `${rows.length} months ${rows[0].day}…${rows[rows.length - 1].day}`;
    } catch (e: any) { report[s.id] = `error: ${String(e?.message || e).slice(0, 200)}`; }
  }
  revalidateTag('price-history');
  const ok = Object.values(report).some(v => /months/.test(v));
  return NextResponse.json({ success: ok, report }, { status: ok ? 200 : 502 });
}
