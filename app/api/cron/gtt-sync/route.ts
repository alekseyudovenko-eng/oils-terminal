// /api/cron/gtt-sync — загрузка месячного импорта масел из Global Trade Tracker в Supabase (gtt_trade).
// Vercel Cron 20–26 числа: за запуск обновляет 2 страны, давно не обновлявшиеся (GTT не даёт
// запускать отчёты параллельно, а функция живёт до 60 с). Вручную: ?key=<CRON_SECRET>[&reporters=RU,UZ][&years=3]
// Пропущенные страной периоды дополняются зеркальными данными (по отчётам партнёров).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { gttReport, type GttRow } from '@/lib/gtt';
import { GTT_HS, GTT_REPORTERS } from '@/lib/gtt-meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Supabase не настроен' }, { status: 500 });

  const p = new URL(request.url).searchParams;
  let reporters = (p.get('reporters') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!reporters.length) {
    // Выбираем 2 страны, обновлявшиеся давнее всего (или ещё не загруженные).
    const { data } = await db.from('gtt_trade').select('reporter,updated_at').order('updated_at', { ascending: false }).limit(20000);
    const seen = new Map<string, string>();
    for (const r of data || []) if (!seen.has(r.reporter)) seen.set(r.reporter, r.updated_at);
    const ageLimit = Date.now() - 20 * 86400_000;
    reporters = GTT_REPORTERS.map(r => r.code)
      .filter(c => !seen.has(c) || Date.parse(seen.get(c)!) < ageLimit)
      .sort((a, b) => (seen.get(a) ?? '').localeCompare(seen.get(b) ?? ''))
      .slice(0, 2);
    if (!reporters.length) return NextResponse.json({ success: true, skipped: 'all reporters fresh' });
  }
  const years = Math.min(Math.max(Number(p.get('years') || 3), 1), 6);
  const now = new Date();
  const from = `${now.getUTCFullYear() - years + 1}-01`;
  const to = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const stamp = now.toISOString();
  const report: Record<string, string> = {};

  // Строго по одной: GTT отклоняет параллельные отчёты.
  const queue = [...reporters];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const rows: GttRow[] = await gttReport({
          impexp: 'I', reporter: r, hscode: GTT_HS.map(h => h.code).join(','), hslevel: 4,
          periodtype: 'M', from, to, currency: 'USD', unit: 'MT', dataelements: 'V,Q1',
          fallbacktomirrordata: true, mirrormissingperiods: true,
        });
        const unique = new Map<string, Record<string, unknown>>();
        for (const x of rows) {
          if (!x.month || !x.year || !x.hsCode) continue;
          const partner = String(x.partnerCode || x.partnerName || '??');
          const hs = String(x.hsCode).slice(0, 4);
          unique.set(`${partner}|${hs}|${x.year}|${x.month}`, {
            flow: 'I', reporter: r, partner, partner_name: x.partnerName ?? null, hs,
            year: Number(x.year), month: Number(x.month), mirrored: false,
            value_usd: x.value ?? null, qty_t: x.quantity1 ?? null, updated_at: stamp,
          });
        }
        const list = Array.from(unique.values());
        for (let i = 0; i < list.length; i += 500) {
          const { error } = await db.from('gtt_trade').upsert(list.slice(i, i + 500), { onConflict: 'flow,reporter,partner,hs,year,month,mirrored' });
          if (error) throw new Error(error.message);
        }
        const last = rows.reduce((m, x) => Math.max(m, Number(x.year) * 100 + Number(x.month || 0)), 0);
        report[r] = `${list.length} строк, последний месяц ${String(last).replace(/(\d{4})(\d{2})/, '$1-$2')}`;
      } catch (e) {
        report[r] = `ошибка: ${(e as Error).message.slice(0, 200)}`;
      }
    }
  };
  await worker();
  const ok = Object.values(report).some(v => !v.startsWith('ошибка'));
  return NextResponse.json({ success: ok, from, to, report }, { status: ok ? 200 : 502 });
}
