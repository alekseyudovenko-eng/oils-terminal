'use client';
// Импорт масел по стране: источники сведены в один ряд (таможня страны → данные экспортёров →
// предварительно). Страна, товар и период выбираются на странице; данные других стран
// подгружаются по запросу (/lab/trade/data).
import { useEffect, useMemo, useState } from 'react';
import type { LabDict } from '@/lib/dict-lab';
import type { CountryMerged, MergedBlock, MonthPt } from '@/lib/trade-merge';
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
  const pct = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${nf1.format(Math.abs(v))}%`);
  return { fmt: (v: number) => nf.format(Math.round(v)), one: (v: number) => nf1.format(v), ymLabel, pct };
}

const total = (p: MonthPt) => p.my + p.id + p.oth;
const shiftYear = (ym: string, d: number) => `${Number(ym.slice(0, 4)) + d}${ym.slice(4)}`;

function Bars({ pts, lang, L }: { pts: MonthPt[]; lang: Locale; L: TrL }) {
  const { fmt, ymLabel } = fmts(lang);
  const W = 760, H = 230, PL = 52, PB = 26, PT = 8;
  const max = Math.max(1, ...pts.map(total));
  const bw = (W - PL - 4) / Math.max(pts.length, 1);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const every = pts.length > 24 ? 3 : pts.length > 12 ? 2 : 1;
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
        const segs: [number, number, string][] = [[0, p.my, 'var(--gold)'], [p.my, p.id, 'var(--ink-3)'], [p.my + p.id, p.oth, 'var(--rule)']];
        return (
          <g key={p.ym} opacity={p.src === 'p' ? 0.35 : 1}>
            <title>{fill(L.mx.tip, { m: ymLabel(p.ym), t: fmt(total(p)), my: fmt(p.my), id: fmt(p.id), o: fmt(p.oth), src: L.mx.src[p.src] })}</title>
            {segs.map(([base, h, color], k) => h > 0 && (
              <rect key={k} x={x} y={y(base + h)} width={w} height={y(base) - y(base + h)} fill={color} />
            ))}
            {p.src === 'x' && total(p) > 0 && <rect x={x} y={y(total(p))} width={w} height={y(0) - y(total(p))} fill="url(#hatch)" />}
            {(i % every === 0 || i === pts.length - 1) && (
              <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{ymLabel(p.ym)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

type Mode = 'l12' | 'ytd' | 'all' | 'custom' | `y${string}`;

export default function TradeExplorer({ initialCode, initial, countries, hs, lang, L }: {
  initialCode: string; initial: CountryMerged;
  countries: { code: string; name: string }[]; hs: { code: string; label: string }[]; lang: Locale; L: TrL;
}) {
  const { fmt, one, ymLabel, pct } = fmts(lang);
  const M = L.mx;
  const [cache, setCache] = useState<Record<string, CountryMerged>>({ [initialCode]: initial });
  const [rc, setRc] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [code, setCode] = useState('1511');
  const [mode, setMode] = useState<Mode>('l12');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Подгрузка страны по запросу.
  useEffect(() => {
    if (cache[rc]) return;
    let alive = true;
    setLoading(true); setErr(false);
    fetch(`/lab/trade/data?r=${encodeURIComponent(rc)}`, { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: CountryMerged) => { if (alive) setCache(c => ({ ...c, [rc]: d })); })
      .catch(() => { if (alive) setErr(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [rc, cache]);

  const country = cache[rc];
  const block: MergedBlock | undefined = country?.[code];
  const solid = useMemo(() => block?.months.filter(p => p.src !== 'p') ?? [], [block]);
  const years = useMemo(() => Array.from(new Set(solid.map(p => p.ym.slice(0, 4)))).sort().reverse(), [solid]);
  const allMonths = block?.months.map(p => p.ym) ?? [];

  // Выбранный период [a, b] включительно.
  const range = useMemo((): [string, string] | null => {
    if (!block || !solid.length) return null;
    const last = solid[solid.length - 1].ym, first = block.months[0].ym;
    if (mode === 'l12') return [solid[Math.max(solid.length - 12, 0)].ym, last];
    if (mode === 'ytd') return [`${last.slice(0, 4)}-01`, last];
    if (mode === 'all') return [first, block.months[block.months.length - 1].ym];
    if (mode.startsWith('y')) { const y = mode.slice(1); return [`${y}-01`, `${y}-12`]; }
    const a = from || first, b = to || last;
    return a <= b ? [a, b] : [b, a];
  }, [block, solid, mode, from, to]);

  const view = useMemo(() => {
    if (!block || !range) return null;
    const [a, b] = range;
    const inR = block.months.filter(p => p.ym >= a && p.ym <= b);
    const sol = inR.filter(p => p.src !== 'p');
    const prevKeys = new Set(sol.map(p => shiftYear(p.ym, -1)));
    const prev = block.months.filter(p => prevKeys.has(p.ym) && p.src !== 'p');
    const sum = (arr: MonthPt[], f: (p: MonthPt) => number) => arr.reduce((s, p) => s + f(p), 0);
    const t = sum(sol, total), tp = prev.length === sol.length && sol.length ? sum(prev, total) : 0;
    const keys = new Set(sol.map(p => p.ym));
    const partners = block.partners.map(s => {
      let v = 0, pv = 0;
      for (const [m, q] of Object.entries(s.t)) { if (keys.has(m)) v += q; if (prevKeys.has(m)) pv += q; }
      return { ...s, v, pv };
    }).filter(s => s.v > 0 || s.pv > 0).sort((x, y) => y.v - x.v || y.pv - x.pv);
    return {
      inR, t, chg: tp > 0 ? (t / tp - 1) * 100 : null,
      my: t > 0 ? (sum(sol, p => p.my) / t) * 100 : null,
      idn: t > 0 ? (sum(sol, p => p.id) / t) * 100 : null,
      usd: t > 0 ? sum(sol, p => p.usd) / t : null,
      hasPrev: tp > 0,
      mixed: prev.some(p => p.src === 'c') && sol.some(p => p.src === 'x'),
      prov: inR.some(p => p.src === 'p'),
      partners,
    };
  }, [block, range]);

  if (!countries.length) return <p className="py-10 text-center text-ink-3 border border-dashed border-rule rounded">{L.notLoaded}</p>;

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

  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-xs ${active ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-2 hover:border-ink-3'}`;
  const presets: [Mode, string][] = [['l12', M.pl12], ['ytd', M.pytd], ...years.map(y => [`y${y}`, y] as [Mode, string]), ['all', M.pall], ['custom', M.pcustom]];

  return (
    <div>
      <div role="tablist" aria-label={L.country} className="flex flex-wrap gap-2 border-b border-rule">
        {countries.map(c => (
          <button key={c.code} type="button" role="tab" aria-selected={c.code === rc} onClick={() => setRc(c.code)}
            className={`px-3 py-2 -mb-px border-b-2 text-sm ${c.code === rc ? 'border-gold text-ink font-medium' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {hs.map(h => (
          <button key={h.code} type="button" aria-pressed={code === h.code} onClick={() => setCode(h.code)}
            disabled={!!country && !country[h.code]} className={`${chip(code === h.code)} disabled:opacity-40`}>
            {h.code} · {h.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3" role="group" aria-label={M.period}>
        <span className="text-xs text-ink-3 mr-1">{M.period}:</span>
        {presets.map(([m, label]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={chip(mode === m)}>{label}</button>
        ))}
        {mode === 'custom' && allMonths.length > 0 && (
          <span className="flex items-center gap-2 text-xs text-ink-2">
            {M.from}
            <select value={from || allMonths[0]} onChange={e => setFrom(e.target.value)} className="rounded border border-rule bg-panel px-2 py-1">
              {allMonths.map(m => <option key={m} value={m}>{ymLabel(m)}</option>)}
            </select>
            {M.to}
            <select value={to || (block?.solidLast ?? allMonths[allMonths.length - 1])} onChange={e => setTo(e.target.value)} className="rounded border border-rule bg-panel px-2 py-1">
              {allMonths.map(m => <option key={m} value={m}>{ymLabel(m)}</option>)}
            </select>
          </span>
        )}
      </div>

      {err ? (
        <p className="py-10 text-center text-ink-3">{M.loadErr}</p>
      ) : loading || !country ? (
        <p className="py-10 text-center text-ink-3" aria-live="polite">{M.loading}</p>
      ) : !block || !view || !range ? (
        <p className="py-10 text-center text-ink-3">{L.noCode}</p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              [M.kpiTotal, `${fmt(view.t)} ${L.t}`],
              [M.kpiYoy, view.hasPrev ? pct(view.chg) : '—'],
              [L.kpiMy, view.my == null ? '—' : `${one(view.my)}%`],
              [M.kpiId, view.idn == null ? '—' : `${one(view.idn)}%`],
              [L.kpiPrice, view.usd == null ? '—' : `$${fmt(view.usd)}/${L.t}`],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-rule pt-2">
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="font-cond text-2xl font-semibold num">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-xs text-ink-3">
            {ymLabel(range[0])} – {ymLabel(range[1])}.{view.mixed ? ` ${M.mixed}` : ''}{view.prov ? ` ${M.provIn}` : ''}
          </p>
          <p className="mt-2 text-sm text-ink-2 max-w-[80ch]">{sourcesLine}</p>

          <figure className="mt-5">
            <Bars pts={view.inR} lang={lang} L={L} />
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
            <table className="w-full text-sm min-w-[620px]">
              <caption className="text-left font-cond text-lg font-semibold mb-2">{L.suppliers}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.country}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{ymLabel(range[0])} – {ymLabel(range[1])}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{M.share}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{M.prevCol}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{M.chgCol}</th>
                  <th scope="col" className="py-2 pl-3 text-left font-normal">{M.srcCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {view.partners.slice(0, 15).map(s => (
                  <tr key={s.code}>
                    <th scope="row" className="py-1.5 pr-4 text-left font-normal">{s.name}</th>
                    <td className="py-1.5 px-3 text-right num font-medium">{s.v ? fmt(s.v) : '—'}</td>
                    <td className="py-1.5 px-3 text-right num text-ink-2">{view.t > 0 && s.v ? `${one((s.v / view.t) * 100)}%` : '—'}</td>
                    <td className="py-1.5 px-3 text-right num text-ink-2">{view.hasPrev && s.pv ? fmt(s.pv) : '—'}</td>
                    <td className="py-1.5 px-3 text-right num text-ink-2">{view.hasPrev && s.pv > 0 ? pct((s.v / s.pv - 1) * 100) : '—'}</td>
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
