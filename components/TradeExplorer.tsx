'use client';
// Импорт масел по стране: источники сведены в один ряд (таможня страны → данные экспортёров →
// предварительно). На графике видно, откуда взят каждый месяц.
import { useMemo, useState } from 'react';
import type { LabDict } from '@/lib/dict-lab';
import type { MergedData, MonthPt } from '@/lib/trade-merge';
import { INTL, type Locale } from '@/lib/i18n';
import { fill } from '@/lib/dict';

type TrL = LabDict['trade'];

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

const total = (p: MonthPt) => p.my + p.id + p.oth;

function Bars({ pts, lang, L }: { pts: MonthPt[]; lang: Locale; L: TrL }) {
  const { fmt, ymLabel } = fmts(lang);
  const W = 760, H = 230, PL = 52, PB = 26, PT = 8;
  const max = Math.max(1, ...pts.map(total));
  const bw = (W - PL - 4) / Math.max(pts.length, 1);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={L.barsAria}>
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--paper)" strokeWidth="1.6" />
        </pattern>
      </defs>
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={PL} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--rule)" />
          <text x={PL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmt(max * f)}</text>
        </g>
      ))}
      {pts.map((p, i) => {
        const x = PL + i * bw + 1, w = Math.max(bw - 2, 1);
        const op = p.src === 'p' ? 0.35 : 1;
        const segs: [number, number, string][] = [[0, p.my, 'var(--gold)'], [p.my, p.id, 'var(--ink-3)'], [p.my + p.id, p.oth, 'var(--rule)']];
        return (
          <g key={p.ym} opacity={op}>
            <title>{fill(L.mx.tip, { m: ymLabel(p.ym), t: fmt(total(p)), my: fmt(p.my), id: fmt(p.id), o: fmt(p.oth), src: L.mx.src[p.src] })}</title>
            {segs.map(([base, h, color], k) => h > 0 && (
              <rect key={k} x={x} y={y(base + h)} width={w} height={y(base) - y(base + h)} fill={color} />
            ))}
            {p.src === 'x' && total(p) > 0 && <rect x={x} y={y(total(p))} width={w} height={y(0) - y(total(p))} fill="url(#hatch)" />}
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
  data: MergedData; countries: { code: string; name: string }[]; hs: { code: string; label: string }[]; lang: Locale; L: TrL;
}) {
  const { fmt, one, ymLabel } = fmts(lang);
  const M = L.mx;
  const avail = countries.filter(c => data[c.code]);
  const [rc, setRc] = useState(avail[0]?.code ?? '');
  const [code, setCode] = useState('1511');
  const block = data[rc]?.[code];

  const kpi = useMemo(() => {
    if (!block || !block.solidLast) return null;
    const solid = block.months.filter(p => p.src !== 'p');
    const last = solid.slice(-12);
    const prevKeys = new Set(last.map(p => `${Number(p.ym.slice(0, 4)) - 1}${p.ym.slice(4)}`));
    const prev = block.months.filter(p => prevKeys.has(p.ym));
    const sum = (a: MonthPt[], f: (p: MonthPt) => number) => a.reduce((s, p) => s + f(p), 0);
    const t12 = sum(last, total), p12 = prev.length === 12 ? sum(prev, total) : 0;
    return {
      t12, chg: p12 > 0 ? (t12 / p12 - 1) * 100 : null,
      my: t12 > 0 ? (sum(last, p => p.my) / t12) * 100 : null,
      idn: t12 > 0 ? (sum(last, p => p.id) / t12) * 100 : null,
      usd: t12 > 0 ? sum(last, p => p.usd) / t12 : null,
      mixed: prev.some(p => p.src === 'c') && last.some(p => p.src === 'x'),
    };
  }, [block]);

  if (!avail.length) return <p className="py-10 text-center text-ink-3 border border-dashed border-rule rounded">{L.notLoaded}</p>;

  // Строка «Источники: …» для выбранной страны и кода.
  const sourcesLine = block ? (() => {
    const parts: string[] = [];
    const ct = { my: block.myLast ? ymLabel(block.myLast) : '—', id: block.idLast ? ymLabel(block.idLast) : '—' };
    if (block.ownLast && block.months[0] && block.ownLast >= block.months[0].ym) {
      parts.push(fill(M.customs, { m: ymLabel(block.ownLast) }));
      if (block.months.some(p => p.src === 'x')) parts.push(fill(M.exporters, ct));
    } else {
      parts.push(fill(M.exportersOnly, ct));
    }
    if (block.solidLast && block.months.some(p => p.src === 'p')) parts.push(fill(M.provisional, { m: ymLabel(block.solidLast) }));
    return `${M.sources}: ${parts.join('; ')}.`;
  })() : '';

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
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              [L.kpi12, `${fmt(kpi.t12)} ${L.t}`],
              [L.kpiPrev, kpi.chg == null ? '—' : `${kpi.chg >= 0 ? '+' : '−'}${one(Math.abs(kpi.chg))}%`],
              [L.kpiMy, kpi.my == null ? '—' : `${one(kpi.my)}%`],
              [M.kpiId, kpi.idn == null ? '—' : `${one(kpi.idn)}%`],
              [L.kpiPrice, kpi.usd == null ? '—' : `$${fmt(kpi.usd)}/${L.t}`],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-rule pt-2">
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="font-cond text-2xl font-semibold num">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-xs text-ink-3">{block.solidLast ? fill(M.window, { m: ymLabel(block.solidLast) }) : ''}{kpi.mixed ? ` ${M.mixed}` : ''}</p>
          <p className="mt-2 text-sm text-ink-2 max-w-[80ch]">{sourcesLine}</p>

          <figure className="mt-5">
            <Bars pts={block.months.slice(-36)} lang={lang} L={L} />
            <figcaption className="mt-1 text-xs text-ink-3 flex flex-wrap gap-x-4 gap-y-1">
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--gold)' }} />{L.my}</span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--ink-3)' }} />{L.id}</span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1" style={{ background: 'var(--rule)' }} />{L.others}</span>
              <span className="text-ink-2">|</span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1 bg-ink-3" />{M.legC}</span>
              <span>
                <span className="inline-block w-3 h-3 align-middle mr-1"
                  style={{ background: 'repeating-linear-gradient(45deg, var(--ink-3) 0 2px, var(--paper) 2px 4px)' }} />{M.legX}
              </span>
              <span><span className="inline-block w-3 h-3 align-middle mr-1 bg-ink-3" style={{ opacity: 0.35 }} />{M.legP}</span>
              <span>{L.perMonth}</span>
            </figcaption>
          </figure>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <caption className="text-left font-cond text-lg font-semibold mb-2">{L.suppliers}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.country}</th>
                  {block.years.map(y => <th key={y} scope="col" className="py-2 px-3 text-right font-normal">{y}</th>)}
                  <th scope="col" className="py-2 px-3 text-right font-normal">{L.m12}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{M.share}</th>
                  <th scope="col" className="py-2 pl-3 text-left font-normal">{M.srcCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {block.suppliers.slice(0, 12).map(s => (
                  <tr key={s.code}>
                    <th scope="row" className="py-1.5 pr-4 text-left font-normal">{s.name}</th>
                    {block.years.map(y => <td key={y} className="py-1.5 px-3 text-right num">{s.byYear[y] ? fmt(s.byYear[y]) : '—'}</td>)}
                    <td className="py-1.5 px-3 text-right num font-medium">{s.last12 ? fmt(s.last12) : '—'}</td>
                    <td className="py-1.5 px-3 text-right num text-ink-2">{kpi.t12 > 0 && s.last12 ? `${one((s.last12 / kpi.t12) * 100)}%` : '—'}</td>
                    <td className="py-1.5 pl-3 text-xs text-ink-3 whitespace-nowrap">{s.src === 'both' ? M.both : 'GTT'}</td>
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
