// lib/country-trade.ts — сводка импорта масел и жиров для страницы страны (по сведённому ряду из trade-merge).
import type { CountryMerged, MergedBlock } from './trade-merge';

export type HsSummary = {
  hs: string;
  from: string; to: string;            // окно последних 12 «надёжных» месяцев, 'YYYY-MM'
  t12: number; t12prev: number | null; // тонны за 12 мес. и за 12 мес. годом ранее
  my: number; id: number;              // тонны из Малайзии / Индонезии за 12 мес.
  usdPerT: number | null;
  years: { y: string; t: number; my: number; full: boolean }[]; // по календарным годам
  top: { code: string; name: string; t: number }[];             // крупнейшие поставщики за 12 мес.
  mixed: boolean;                      // в окне есть месяцы по данным экспортёров
};

const shift = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
};

function summarize(hs: string, b: MergedBlock): HsSummary | null {
  const solid = b.months.filter(p => p.src !== 'p');
  if (!solid.length || !b.solidLast) return null;
  const to = b.solidLast, from = shift(to, -11);
  const pf = shift(from, -12), pt = shift(to, -12);
  const inW = (m: string, a: string, z: string) => m >= a && m <= z;
  const tot = (p: { my: number; id: number; oth: number }) => p.my + p.id + p.oth;
  const cur = solid.filter(p => inW(p.ym, from, to));
  const prev = solid.filter(p => inW(p.ym, pf, pt));
  const t12 = cur.reduce((s, p) => s + tot(p), 0);
  const usd = cur.reduce((s, p) => s + p.usd, 0);

  const byYear = new Map<string, { t: number; my: number; n: number }>();
  for (const p of solid) {
    const y = p.ym.slice(0, 4);
    const v = byYear.get(y) ?? { t: 0, my: 0, n: 0 };
    v.t += tot(p); v.my += p.my; v.n++;
    byYear.set(y, v);
  }
  const top = b.partners
    .map(s => ({ code: s.code, name: s.name, t: Object.entries(s.t).reduce((a, [m, v]) => a + (inW(m, from, to) ? v : 0), 0) }))
    .filter(s => s.t > 0).sort((a, z) => z.t - a.t).slice(0, 6);

  return {
    hs, from, to, t12,
    t12prev: prev.length === 12 ? prev.reduce((s, p) => s + tot(p), 0) : null,
    my: cur.reduce((s, p) => s + p.my, 0), id: cur.reduce((s, p) => s + p.id, 0),
    usdPerT: t12 > 0 ? usd / t12 : null,
    years: Array.from(byYear.entries()).sort(([a], [z]) => a.localeCompare(z)).map(([y, v]) => ({ y, t: v.t, my: v.my, full: v.n === 12 })),
    top, mixed: cur.some(p => p.src === 'x'),
  };
}

export function summarizeTrade(merged: CountryMerged): Record<string, HsSummary> {
  const out: Record<string, HsSummary> = {};
  for (const [hs, b] of Object.entries(merged)) { const s = summarize(hs, b); if (s) out[hs] = s; }
  return out;
}
