// /lab — закрытая «Лаборатория IMA»: черновик прогноза цены пальмового масла.
// Доступ только по паролю (middleware.ts), в меню сайта ссылки нет.
import type { Metadata } from 'next';
import Section from '@/components/Section';
import LabHeader from '@/components/LabHeader';
import forecast from '@/data/forecast.json';
import forecastI18n from '@/data/forecast.i18n.json';
import { fmtInt } from '@/lib/format';
import { fill } from '@/lib/dict';
import { INTL, type Locale } from '@/lib/i18n';
import { getLabDict, overlay, monthLabel } from '@/lib/lab-i18n';
import type { LabDict } from '@/lib/dict-lab';

export function generateMetadata(): Metadata {
  const { L } = getLabDict();
  return { title: L.fc.h1, robots: { index: false, follow: false } };
}

type Range = { low: number; high: number; point?: number; prob: number };
type Horizon = {
  id: string; name: string; period: string;
  scenarios: { bear: Range; base: Range; bull: Range };
  ensemble: { source: string; value: number; weight: number }[];
  drivers: { bear: string; base: string; bull: string };
  triggers: string[];
};

type FC = {
  label: string; asOf: string; benchmark: string;
  spot: { myr: number; usd: number; usdmyr: number; note: string };
  horizons: Horizon[];
  backtest: { period: string; note: string; rows: { h: number; rmseRw: number; rmseModel: number; hit: number; skill: number }[] };
  elNino: { note: string; current: string; rows: { start: string; oni: number; after6: number | null; after12: number | null }[] };
  curve: { capturedAt: string; note: string; points: { m: string; v: number }[] };
  external: { who: string; date: string; view: string; url: string }[];
  method: string[];
};
const BASE = forecast as unknown as FC;

const SC_IDS = ['bear', 'base', 'bull'] as const;

function fmtFor(lang: Locale, F: FC) {
  const n = (v: number) => fmtInt(v, lang);
  return {
    n,
    usd: (myr: number) => n(myr / F.spot.usdmyr),
    dec: (v: number) => v.toLocaleString(INTL[lang], { maximumFractionDigits: 2 }),
    pct: (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString(INTL[lang], { maximumFractionDigits: 1 })}%`),
    date: (d: string) => new Date(d).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

function CurveChart({ F, lang, L }: { F: FC; lang: Locale; L: LabDict }) {
  const { n: fmtN, date } = fmtFor(lang, F);
  const pts = F.curve.points.map(p => ({ ...p, m: monthLabel(p.m, lang) }));
  const W = 720, H = 200, PL = 44, PR = 8, PT = 10, PB = 26;
  const vals = pts.map(p => p.v).concat(F.spot.myr);
  const min = Math.floor(Math.min(...vals) / 100) * 100 - 100;
  const max = Math.ceil(Math.max(...vals) / 100) * 100 + 100;
  const x = (i: number) => PL + (i / (pts.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const ticks = [min + 100, Math.round((min + max) / 200) * 100, max - 100];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const peakI = pts.indexOf(peak);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={fill(L.fc.curveAria, { a: fmtN(pts[0].v), am: pts[0].m, b: fmtN(peak.v), bm: peak.m })}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
            <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmtN(t)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
        {pts.map((p, i) => <circle key={p.m} cx={x(i)} cy={y(p.v)} r="2.5" fill="var(--gold)" />)}
        <text x={x(peakI)} y={y(peak.v) - 8} textAnchor="middle" fontSize="11" fill="var(--ink)">{fmtN(peak.v)}</text>
        {pts.map((p, i) => (i % 2 === 0 ? <text key={p.m} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--ink-3)">{p.m}</text> : null))}
      </svg>
      <figcaption className="mt-1 text-xs text-ink-3">{fill(L.fc.curveCaption, { date: date(F.curve.capturedAt) })} {F.curve.note}</figcaption>
    </figure>
  );
}

export default function LabPage() {
  const { lang, L } = getLabDict();
  const F: FC = lang === 'ru' ? BASE : overlay(BASE, (forecastI18n as Record<string, unknown>)[lang]);
  if (lang !== 'ru') F.elNino = { ...F.elNino, rows: F.elNino.rows.map(r => ({ ...r, start: monthLabel(r.start, lang, false) })) };
  const { n: fmtInt, usd, pct, date, dec } = fmtFor(lang, F);
  const SC = SC_IDS.map(id => ({ id, name: L.fc.sc[id] }));
  return (
    <>
      <LabHeader current="/lab" note={F.label} translated />

      <main className="mx-auto max-w-page w-full px-4 sm:px-6">
        <section aria-labelledby="fc-title" className="py-8 border-b border-rule">
          <h1 id="fc-title" className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{L.fc.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            {fill(L.fc.start, { benchmark: F.benchmark, myr: fmtInt(F.spot.myr), usd: fmtInt(F.spot.usd), note: F.spot.note })}{' '}
            {fill(L.fc.asOf, { date: date(F.asOf) })}
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <caption className="sr-only">{L.fc.caption}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.fc.horizon}</th>
                  {SC.map(s => (
                    <th key={s.id} scope="col" className={`py-2 px-4 text-left font-normal ${s.id === 'base' ? 'text-ink' : ''}`}>{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.horizons.map(h => (
                  <tr key={h.id}>
                    <th scope="row" className="py-4 pr-4 text-left align-top font-normal">
                      <a href={`#${h.id}`} className="font-medium text-ink hover:text-gold">{h.name}</a>
                      <span className="block text-xs text-ink-3">{h.period}</span>
                    </th>
                    {SC.map(s => {
                      const r = h.scenarios[s.id];
                      return (
                        <td key={s.id} className={`py-4 px-4 align-top ${s.id === 'base' ? 'bg-gold-soft/60' : ''}`}>
                          <span className={`block font-cond num ${s.id === 'base' ? 'text-2xl font-semibold' : 'text-xl font-medium'}`}>
                            {fmtInt(r.low)}–{fmtInt(r.high)}
                          </span>
                          <span className="block text-xs text-ink-3 num">${usd(r.low)}–{usd(r.high)} · {fill(L.fc.prob, { p: r.prob })}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {F.horizons.map(h => (
          <Section key={h.id} id={h.id} title={`${h.name}: ${lang === 'ru' ? h.period.toLowerCase() : h.period}`}>
            <div className="grid gap-6 lg:grid-cols-3">
              {SC.map(s => (
                <div key={s.id} className={s.id === 'base' ? 'lg:order-none' : ''}>
                  <h3 className="font-cond text-lg font-semibold">
                    {s.name} <span className="text-sm font-normal text-ink-3 num">{fmtInt(h.scenarios[s.id].low)}–{fmtInt(h.scenarios[s.id].high)}</span>
                  </h3>
                  <p className="mt-1 text-sm text-ink-2 leading-relaxed">{h.drivers[s.id]}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="font-cond text-lg font-semibold mb-2">{L.fc.triggers}</h3>
                <ul className="text-sm text-ink-2 list-disc pl-5 space-y-1">
                  {h.triggers.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-cond text-lg font-semibold mb-2">{L.fc.ensemble}</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-rule">
                    {h.ensemble.map(e => (
                      <tr key={e.source}>
                        <td className="py-1.5 pr-3 text-ink-2">{e.source}</td>
                        <td className="py-1.5 px-3 text-right num">{fmtInt(e.value)}</td>
                        <td className="py-1.5 pl-3 text-right num text-ink-3">{Math.round(e.weight * 100)}%</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-1.5 pr-3">{L.fc.total}</td>
                      <td className="py-1.5 px-3 text-right num">{fmtInt(h.scenarios.base.point ?? 0)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        ))}

        <Section id="curve" title={L.fc.curveTitle} note={L.fc.curveNote}>
          <CurveChart F={F} lang={lang} L={L} />
        </Section>

        <Section id="elnino" title={L.fc.elTitle} note={`${F.elNino.current} ${F.elNino.note}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-xl">
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.fc.elCols.start}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">ONI</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{L.fc.elCols.after6}</th>
                  <th scope="col" className="py-2 pl-3 text-right font-normal">{L.fc.elCols.after12}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.elNino.rows.map(r => (
                  <tr key={r.start} className={r.after6 == null ? 'bg-gold-soft/60' : ''}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{r.start}</th>
                    <td className="py-2 px-3 text-right num">{dec(r.oni)}</td>
                    <td className="py-2 px-3 text-right num">{r.after6 == null ? L.fc.now : pct(r.after6)}</td>
                    <td className="py-2 pl-3 text-right num">{pct(r.after12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="accuracy" title={L.fc.accTitle} note={F.backtest.note}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-2xl">
              <caption className="text-left text-xs text-ink-3 pb-2">{fill(L.fc.accCaption, { period: F.backtest.period })}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{L.fc.accCols.horizon}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{L.fc.accCols.rw}</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">{L.fc.accCols.model}</th>
                  <th scope="col" className="py-2 pl-3 text-right font-normal">{L.fc.accCols.hit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.backtest.rows.map(r => (
                  <tr key={r.h}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{fill(L.fc.months, { h: r.h })}</th>
                    <td className="py-2 px-3 text-right num">±{dec(r.rmseRw)}%</td>
                    <td className={`py-2 px-3 text-right num ${r.skill > 0 ? 'text-up' : 'text-down'}`}>±{dec(r.rmseModel)}%</td>
                    <td className="py-2 pl-3 text-right num">{r.hit}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="external" title={L.fc.extTitle}>
          <ul className="divide-y divide-rule text-sm">
            {F.external.map(e => (
              <li key={e.who} className="py-2.5 grid sm:grid-cols-[14rem_1fr] gap-x-6 gap-y-0.5">
                <span className="font-medium">{e.who} <span className="block text-xs font-normal text-ink-3">{date(e.date)}</span></span>
                <span className="text-ink-2">
                  {e.view}. <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-ink-3 underline underline-offset-2 hover:text-gold">{L.fc.source}</a>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="method" title={L.fc.methodTitle}>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-ink-2 max-w-[80ch]">
            {F.method.map(m => <li key={m}>{m}</li>)}
          </ol>
          <p className="mt-4 text-xs text-ink-3">{L.fc.footer}</p>
        </Section>
      </main>
    </>
  );
}
