// /api/cron/comtrade-sync — экспорт пальмовых продуктов Малайзии и Индонезии по странам назначения
// (UN Comtrade, помесячно, последние 24 месяца) в Supabase (comtrade_trade).
// Vercel Cron раз в месяц; вручную: ?key=<CRON_SECRET>[&reporter=458][&months=24][&check=1]
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { comtradeGet, COMTRADE_EXPORTERS, COMTRADE_HS } from '@/lib/comtrade';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 1; i <= n; i++) {
    d.setUTCMonth(d.getUTCMonth() - 1);
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out.reverse();
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = new URL(request.url).searchParams;

  // Проверка ключа: один маленький запрос, ничего не пишет.
  if (p.get('check') === '1') {
    try {
      const rows = await comtradeGet('M', {
        reporterCode: 458, flowCode: 'X', cmdCode: '1511', partnerCode: 643,
        period: lastMonths(14).join(','), partner2Code: 0, motCode: 0, customsCode: 'C00', includeDesc: true,
      });
      return NextResponse.json({ ok: true, rows: rows.length, sample: rows.slice(0, 3).map(r => ({ period: r.period, partner: r.partnerDesc, netWgt: r.netWgt, value: r.primaryValue })) });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
    }
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Supabase не настроен' }, { status: 500 });
  const months = Math.min(Math.max(Number(p.get('months') || 24), 1), 36);
  const reporters = p.get('reporter') ? COMTRADE_EXPORTERS.filter(r => String(r.code) === p.get('reporter')) : COMTRADE_EXPORTERS;
  const periods = lastMonths(months);
  const stamp = new Date().toISOString();
  const report: Record<string, string> = {};

  for (const rep of reporters) {
    let written = 0;
    try {
      for (let i = 0; i < periods.length; i += 12) {
        const rows = await comtradeGet('M', {
          reporterCode: rep.code, flowCode: 'X', cmdCode: COMTRADE_HS.join(','),
          period: periods.slice(i, i + 12).join(','),
          partner2Code: 0, motCode: 0, customsCode: 'C00', includeDesc: true,
        });
        const unique = new Map<string, Record<string, unknown>>();
        for (const r of rows) {
          const partner = r.partnerISO || String(r.partnerCode ?? '');
          if (!partner || partner === 'W00' || r.partnerCode === 0) continue; // «Весь мир» не храним
          const hs = String(r.cmdCode || '').slice(0, 4);
          const period = Number(r.period);
          if (!hs || !period) continue;
          unique.set(`${partner}|${hs}|${period}`, {
            flow: 'X', reporter: rep.iso, partner, partner_name: r.partnerDesc ?? null, hs, period,
            value_usd: r.primaryValue ?? null, qty_t: r.netWgt != null ? Number(r.netWgt) / 1000 : null, updated_at: stamp,
          });
        }
        const list = Array.from(unique.values());
        for (let j = 0; j < list.length; j += 500) {
          const { error } = await db.from('comtrade_trade').upsert(list.slice(j, j + 500), { onConflict: 'flow,reporter,partner,hs,period' });
          if (error) throw new Error(error.message);
        }
        written += list.length;
      }
      report[rep.iso] = `${written} строк`;
    } catch (e) {
      report[rep.iso] = `ошибка: ${(e as Error).message.slice(0, 200)}`;
    }
  }
  const ok = Object.values(report).some(v => !v.startsWith('ошибка'));
  return NextResponse.json({ success: ok, periods: `${periods[0]}–${periods[periods.length - 1]}`, report }, { status: ok ? 200 : 502 });
}
