'use client';
// Импорт масел по данным Global Trade Tracker: страна × код ТН ВЭД, помесячно и по поставщикам.
import { useMemo, useState } from 'react';
import type { LabDict } from '@/lib/dict-lab';
import { INTL, type Locale } from '@/lib/i18n';
import { fill } from '@/lib/dict';

type TrL = LabDict['trade'];

export type SeriesPoint = { ym: string; t: number; my: number; id: number; usd: number };
export type Supplier = { name: string; byYear: Record<string, number>; last12: number };
export type TradeBlock = { months: SeriesPoint[]; suppliers: Supplier[]; years: string[] };
export type TradeData = Record<string, Record<string, TradeBlock>>; // reporter → hs → block

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function fmts(lang: Locale) {
  const nf = new Intl.NumberFormat(INTL[lang], { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(INTL[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const ymLabel = (ym: string) => {
    const m = Number(ym.slice(5));
    const mon = lang === 'ru' ? RU_MONTHS[m - 1]
      : new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString(INTL[lang], { month: 'short', timeZone: 'UTC' }).replace('.', '');
    return `${mon} ${ym.slice(2, 4)}`;
  };
  return { fmt: (v: number) => nf.format(Math.round(v)), one: (v: number) => nf1.format(v), ymLabel };
}

function Bars({ pts, lang, L }: { pts: SeriesPoint[]; lang: Locale; L: TrL }) {
  const { fmt, ymLabel } = fmts(lang);
  const W = 760, H = 220, PL = 48, PB = 26, PT = 8;
  const max = Math.max(1, ...pts.map(p => p.t));
  const bw = (W - PL - 4) / Math.max(pts.length, 1);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={L.barsAria}>
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={PL} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--rule)" />
          <text x={PL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmt(max * f)}</text>
        </g>
      ))}
      {pts.map((p, i) => {
        const x = PL + i * bw + 1, w = Math.max(bw - 2, 1);
        return (
          <g key={p.ym}>
            <title>{fill(L.tip, { m: ymLabel(p.ym), t: fmt(p.t), my: fmt(p.my), id: fmt(p.id) })}</title>
            <rect x={x} y={y(p.t)} width={w} height={y(0) - y(p.t)} fill="var(--rule)" />
            <rect x={x} y={y(p.id + p.my)} width={w} height={y(0) - y(p.id)} fill="var(--ink-3)" />
            <rect x={x} y={y(p.my)} width={w} height={y(0) - y(p.my)} fill="var(--gold)" />
            {(i % 3 === 0 || i === pts.length - 1) && (
              <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{ymLabel(p.ym)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function TradeExplorer({ data, countries, hs, lang, L }: {
  data: TradeData; countries: { code: string; name: string }[]; hs: { code: string; label: string }[]; lang: Locale; L: TrL;
}) {
  const { fmt, one, ymLabel } = fmts(lang);
  const avail = countries.filter(c => data[c.code]);
  const [rc, setRc] = useState(avail[0]?.code ?? '');
  const [code, setCode] = useState('1511');
  const block = data[rc]?.[code];

  const kpi = useMemo(() => {
    if (!block) return null;
    const m = block.months;
    const last = m.slice(-12), prev = m.slice(-24, -12);
    const sum = (a: SeriesPoint[], k: keyof SeriesPoint) => a.reduce((s, p) => s + (p[k] as number), 0);
    const t12 = sum(last, 't'), p12 = sum(prev, 't');
    return {
      t12, chg: p12 > 0 ? (t12 / p12 - 1) * 100 : null,
      my: t12 > 0 ? (sum(last, 'my') / t12) * 100 : null,
      idn: t12 > 0 ? (sum(last, 'id') / t12) * 100 : null,
      usd: t12 > 0 ? sum(last, 'usd') / t12 : null,
      lastYm: m[m.length - 1]?.ym,
    };
  }, [block]);

  if (!avail.length) return <p className="py-10 text-center text-ink-3 border border-dashed border-rule rounded">{L.notLoaded}</p>;

  return (
    <div>
      <div role="tablist" aria-label={L.country} className="flex flex-wrap gap-2 border-b border-rule">
        {avail.map(c => (
          <button key={c.code} type="button" role="tab" aria-selected={c.code === rc} onClick={() => setRc(c.code)}
            className={`px-3 py-2 -mb-px border-b-2 text-sm ${c.code === rc ? 'border-gold text-ink font-medium' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {hs.map(h => (
          <button key={h.code} type="button" aria-pressed={code === h.code} onClick={() => setCode(h.code)}
            disabled={!data[rc]?.[h.code]}
            className={`rounded-full border px-3 py-1 text-xs disabled:opacity-40 ${code === h.code ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-2 hover:border-ink-3'}`}>
            {h.code} · {h.label}
          </button>
        ))}
      </div>

      {!block || !kpi ? (
        <p className="py-10 text-center text-ink-3">{L.noCode}</p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              [L.kpi12, `${fmt(kpi.t12)} ${L.t}`],
              [L.kpiPrev, kpi.chg == null ? '—' : `${kpi.chg >= 0 ? '+' : '−'}${one(Math.abs(kpi.chg))}%`],
              [L.kpiMy, kpi.my == null ? '—' : `${one(kpi.my)}%`],
              [L.kpiPrice, kpi.usd == null ? '—' : `$${fmt(kpi.usd)}/${L.t}`],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-rule pt-2">
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="font-cond text-2xl font-semibold num">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-xs text-ink-3">{fill(L.lastMonth, { m: kpi.lastYm ? ymLabel(kpi.lastYm) : '—', p: kpi.idn == null ? '—' : `${one(kpi.idn)}%` })}</p>

          <figure className="mt-6">
            <Bars pts={block.months.slice(-36)} lang={lang} L={L} />
            <figcaption className="mt-1 text-xs text-ink-3 flex flex-wrap gap-4">
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--gold)' }} />{L.my}</span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--ink-3)' }} />{L.id}</span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--rule)' }} />{L.others}</span>
              <span>{L.perMonth}</span>
            </figcaption>
          </figure>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <caption className="text-left font-cond text-lg font-semibold mb-2">{L.suppliers}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.country}</th>
                  {block.years.map(y => <th key={y} scope="col" className="py-2 px-3 text-right font-normal">{y}</th>)}
                  <th scope="col" className="py-2 pl-3 text-right font-normal">{L.m12}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {block.suppliers.slice(0, 12).map(s => (
                  <tr key={s.name}>
                    <th scope="row" className="py-1.5 pr-4 text-left font-normal">{s.name}</th>
                    {block.years.map(y => <td key={y} className="py-1.5 px-3 text-right num">{s.byYear[y] ? fmt(s.byYear[y]) : '—'}</td>)}
                    <td className="py-1.5 pl-3 text-right num font-medium">{s.last12 ? fmt(s.last12) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
