// /api/cron/price-history — дневные цены закрытия для графиков (таблица price_history).
// Источники: Sina Finance (FCPO, Далянь, Чжэнчжоу, CBOT, нефть) и Yahoo Finance (валюты, запасные).
// Vercel Cron каждый будний вечер берёт последние 10 дней (?bars=10 по умолчанию).
// Первичная загрузка истории: ?key=<CRON_SECRET>&bars=1500 (≈6 лет), можно частями: &ids=fcpo,zl.
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isCronAuthorized } from '@/lib/auth';
import { getFreshDb as getDb } from '@/lib/db';
import { INSTRUMENTS } from '@/lib/instruments';
import { CHART_IDS, HISTORY_SOURCES, sinaDailyBars, sinaGlobalBars, yahooBars, type Bar } from '@/lib/tv-history';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;


export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const bars = Math.min(Math.max(Number(params.get('bars')) || 10, 2), 3000);
  const ids = (params.get('ids') || CHART_IDS.join(',')).split(',').map(s => s.trim()).filter(id => CHART_IDS.includes(id));
  const db = getDb();
  if (!db) return NextResponse.json({ success: false, error: 'no database' }, { status: 500 });

  const report: Record<string, string> = {};
  await Promise.all(ids.map(async id => {
    const inst = INSTRUMENTS.find(i => i.id === id);
    if (!inst) { report[id] = 'unknown'; return; }
    let got: Bar[] = [];
    let source = '';
    const errors: string[] = [];
    for (const src of HISTORY_SOURCES[id] || []) {
      try {
        const all = src.kind === 'sina' ? await sinaDailyBars(src.code) : src.kind === 'sinaGlobal' ? await sinaGlobalBars(src.code) : await yahooBars(src.code);
        got = all.slice(-bars); source = `${src.kind}:${src.code}`;
        if (got.length) break;
      } catch (e: any) { errors.push(String(e?.message || e)); }
    }
    if (!got.length) { report[id] = `error: ${errors.join(' | ').slice(0, 300)}`; return; }
    const now = new Date().toISOString();
    const rows = got.map(b => ({ series: id, day: b.day, close: b.close, source, updated_at: now }));
    for (let i = 0; i < rows.length; i += 1000) {
      const { error } = await db.from('price_history').upsert(rows.slice(i, i + 1000), { onConflict: 'series,day' });
      if (error) { report[id] = `db error: ${error.message}`; return; }
    }
    report[id] = `${rows.length} bars ${rows[0].day}…${rows[rows.length - 1].day} (${source})`;
  }));
  revalidateTag('price-history');
  const ok = Object.values(report).some(v => /bars/.test(v));
  return NextResponse.json({ success: ok, bars, report }, { status: ok ? 200 : 502 });
}
