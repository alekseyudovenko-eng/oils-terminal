// /lab/trade — закрытая страница «Лаборатории IMA»: импорт масел по данным Global Trade Tracker.
// Данные GTT лицензированы и показываются только здесь, под паролем лаборатории.
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import TradeExplorer, { type TradeData, type SeriesPoint, type Supplier } from '@/components/TradeExplorer';
import { getTrade } from '@/lib/gtt-data';
import { GTT_HS, GTT_REPORTERS } from '@/lib/gtt-meta';
import { getLabDict } from '@/lib/lab-i18n';
import { fill } from '@/lib/dict';
import { INTL } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  const { L } = getLabDict();
  return { title: `${L.trade.meta} · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}
export const revalidate = 3600;

export default async function TradePage() {
  const { rows, updatedAt } = await getTrade();
  const { lang, L } = getLabDict();
  const T = L.trade;
  // Названия стран — по коду ISO на языке страницы (в GTT Сербия — XS); служебные коды GTT — свои подписи.
  const dn = new Intl.DisplayNames([INTL[lang]], { type: 'region' });
  const SPECIAL: Record<string, string> = { QU: T.unspecified, QV: T.unspecified, QW: T.unspecified, Q1: T.otherEurope };
  const region = (code: string, fallback?: string | null) => {
    if (SPECIAL[code]) return SPECIAL[code];
    const iso = code === 'XS' ? 'RS' : code;
    if (/^[A-Z]{2}$/.test(iso) && iso !== 'AN') {
      try { const n = dn.of(iso); if (n && n !== iso) return n; } catch { /* нет в справочнике */ }
    }
    return fallback || code;
  };

  // Свод: страна → код → помесячно (всего / Малайзия / Индонезия) и поставщики по годам.
  const data: TradeData = {};
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.reporter}|${r.hs}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  for (const [k, list] of Array.from(groups.entries())) {
    const [rep, hs] = k.split('|');
    const months = new Map<string, SeriesPoint>();
    for (const r of list) {
      const ym = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const p = months.get(ym) ?? { ym, t: 0, my: 0, id: 0, usd: 0 };
      const t = r.qty_t ?? 0;
      p.t += t; p.usd += r.value_usd ?? 0;
      if (r.partner === 'MY') p.my += t;
      if (r.partner === 'ID') p.id += t;
      months.set(ym, p);
    }
    // Непрерывный ряд месяцев: пропуски = 0.
    const keys = Array.from(months.keys()).sort();
    const series: SeriesPoint[] = [];
    if (keys.length) {
      let [y, m] = keys[0].split('-').map(Number);
      const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
      while (y * 12 + m <= ly * 12 + lm) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        series.push(months.get(ym) ?? { ym, t: 0, my: 0, id: 0, usd: 0 });
        m++; if (m > 12) { m = 1; y++; }
      }
    }
    const last12 = new Set(series.slice(-12).map(p => p.ym));
    const sup = new Map<string, Supplier>();
    for (const r of list) {
      const name = region(r.partner, r.partner_name);
      const s = sup.get(name) ?? { name, byYear: {}, last12: 0 };
      const t = r.qty_t ?? 0;
      s.byYear[String(r.year)] = (s.byYear[String(r.year)] ?? 0) + t;
      if (last12.has(`${r.year}-${String(r.month).padStart(2, '0')}`)) s.last12 += t;
      sup.set(name, s);
    }
    const years = Array.from(new Set(list.map(r => String(r.year)))).sort();
    (data[rep] ??= {})[hs] = {
      months: series,
      suppliers: Array.from(sup.values()).sort((a, b) => b.last12 - a.last12 || (b.byYear[years[years.length - 1]] ?? 0) - (a.byYear[years[years.length - 1]] ?? 0)),
      years,
    };
  }

  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  return (
    <>
      <LabHeader current="/lab/trade" note={getDict().t.lab.notes.trade} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{T.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            {T.lead}
          </p>
          <p className="mt-2 text-sm text-ink-2 max-w-[70ch]">
            {T.russia}
          </p>
          <p className="mt-1 text-xs text-ink-3">{updated ? fill(T.loaded, { d: updated }) : ''}{T.monthly}</p>
        </section>
        <TradeExplorer data={data} lang={lang} L={T}
          countries={GTT_REPORTERS.map(c => ({ code: c.code, name: lang === 'ru' ? c.name : region(c.code, c.name) }))}
          hs={GTT_HS.map(h => ({ code: h.code, label: T.hs[h.code as keyof typeof T.hs] ?? h.label }))} />
      </main>
    </>
  );
}
