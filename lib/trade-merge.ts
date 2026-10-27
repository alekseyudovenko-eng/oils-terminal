// lib/trade-merge.ts — сведение источников по импорту страны в один ряд.
// Правила:
//  1. Пока есть собственная таможенная статистика страны (GTT, до last_available) — берём её.
//  2. Дальше Малайзия и Индонезия — по их экспорту (UN Comtrade), прочие поставщики — по зеркальной
//     статистике GTT. Месяцы помечаются как «данные экспортёров».
//  3. После последнего месяца Comtrade — только зеркальные данные GTT, они неполные: «предварительно»,
//     в итоги за 12 месяцев не входят.
import type { TradeRow } from './gtt-meta';
import type { ComtradeRowDb, ReporterStatus } from './gtt-data';
import { COMTRADE_HS as CT_HS } from './comtrade';

export type Src = 'c' | 'x' | 'p';
export type MonthPt = { ym: string; my: number; id: number; oth: number; usd: number; src: Src };
export type SupplierRow = { code: string; name: string; byYear: Record<string, number>; last12: number; src: 'gtt' | 'both' };
export type MergedBlock = {
  months: MonthPt[];
  suppliers: SupplierRow[];
  years: string[];
  ownLast: string | null;   // последний месяц собственной статистики, 'YYYY-MM'
  myLast: string | null;    // последний месяц Comtrade по Малайзии
  idLast: string | null;    // последний месяц Comtrade по Индонезии
  solidLast: string | null; // последний месяц, который идёт в итоги
};
export type MergedData = Record<string, Record<string, MergedBlock>>;

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const fromNum = (n: number) => ym(Math.floor(n / 100), n % 100);

function monthRange(a: string, b: string): string[] {
  const out: string[] = [];
  let [y, m] = a.split('-').map(Number);
  const [ly, lm] = b.split('-').map(Number);
  while (y * 12 + m <= ly * 12 + lm) { out.push(ym(y, m)); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

export function mergeTrade(
  rows: TradeRow[], status: ReporterStatus[], comtrade: ComtradeRowDb[],
  reporters: { code: string; iso3: string }[],
  partnerName: (code: string, fallback?: string | null) => string,
): MergedData {
  // Последний месяц собственной статистики: только если он в формате YYYYMM.
  const own = new Map<string, string>();
  for (const s of status) if (s.last_available && /^\d{6}$/.test(s.last_available)) own.set(s.reporter, fromNum(Number(s.last_available)));

  // Comtrade: экспортёр → партнёр(ISO3) → код → месяц → { t, usd }; и последний месяц по экспортёру.
  const ct = new Map<string, { t: number; usd: number }>();
  const ctLast: Record<string, string> = {};
  for (const r of comtrade) {
    const k = `${r.reporter}|${r.partner}|${r.hs}|${fromNum(r.period)}`;
    ct.set(k, { t: r.qty_t ?? 0, usd: r.value_usd ?? 0 });
    const m = fromNum(r.period);
    if (!ctLast[r.reporter] || m > ctLast[r.reporter]) ctLast[r.reporter] = m;
  }
  const myLast = ctLast.MYS ?? null, idLast = ctLast.IDN ?? null;
  const ctFirst = comtrade.length ? fromNum(Math.min(...comtrade.map(r => r.period))) : null;

  const byKey = new Map<string, TradeRow[]>();
  for (const r of rows) {
    const k = `${r.reporter}|${r.hs}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  const out: MergedData = {};
  for (const [k, list] of Array.from(byKey.entries())) {
    const [rep, hs] = k.split('|');
    const iso3 = reporters.find(r => r.code === rep)?.iso3;
    const ownLast = own.get(rep) ?? null;
    const inOwn = (m: string) => !!ownLast && m <= ownLast;
    const ctHs = CT_HS.includes(hs);
    const ctCovers = (m: string, last: string | null) => ctHs && !!iso3 && !!ctFirst && !!last && m >= ctFirst && m <= last;

    // GTT по месяцам и партнёрам.
    const g = new Map<string, { t: number; usd: number; my: number; myUsd: number; id: number; idUsd: number }>();
    let firstM = '9999-99', lastM = '0000-00';
    for (const r of list) {
      const m = ym(r.year, r.month);
      if (m < firstM) firstM = m;
      if (m > lastM) lastM = m;
      const p = g.get(m) ?? { t: 0, usd: 0, my: 0, myUsd: 0, id: 0, idUsd: 0 };
      const t = r.qty_t ?? 0, usd = r.value_usd ?? 0;
      p.t += t; p.usd += usd;
      if (r.partner === 'MY') { p.my += t; p.myUsd += usd; }
      if (r.partner === 'ID') { p.id += t; p.idUsd += usd; }
      g.set(m, p);
    }
    const lastGtt = lastM;
    if (ctHs && iso3 && comtrade.some(c => c.partner === iso3)) for (const last of [myLast, idLast]) if (last && last > lastM) lastM = last;

    const months: MonthPt[] = monthRange(firstM, lastM).map(m => {
      const p = g.get(m) ?? { t: 0, usd: 0, my: 0, myUsd: 0, id: 0, idUsd: 0 };
      const othT = Math.max(p.t - p.my - p.id, 0), othUsd = Math.max(p.usd - p.myUsd - p.idUsd, 0);
      if (inOwn(m)) return { ym: m, my: p.my, id: p.id, oth: othT, usd: p.usd, src: 'c' as Src };
      const useMy = ctCovers(m, myLast), useId = ctCovers(m, idLast);
      const cMy = useMy ? ct.get(`MYS|${iso3}|${hs}|${m}`) ?? { t: 0, usd: 0 } : null;
      const cId = useId ? ct.get(`IDN|${iso3}|${hs}|${m}`) ?? { t: 0, usd: 0 } : null;
      const my = cMy ? cMy.t : p.my, id = cId ? cId.t : p.id;
      const usd = othUsd + (cMy ? cMy.usd : p.myUsd) + (cId ? cId.usd : p.idUsd);
      // «Экспортёры» — пока хотя бы один из двух крупных поставщиков покрыт Comtrade; до начала
      // ряда Comtrade — зеркальные данные GTT (тоже по отчётам экспортёров).
      const solid = ctHs ? (useMy || useId || (!!ctFirst && m < ctFirst)) : m < lastGtt; // без Comtrade последний зеркальный месяц неполный
      return { ym: m, my, id, oth: othT, usd, src: (solid ? 'x' : 'p') as Src };
    });

    // Хвост «предварительно» без данных вообще — отрезаем.
    while (months.length && months[months.length - 1].src === 'p' && months[months.length - 1].my + months[months.length - 1].id + months[months.length - 1].oth === 0) months.pop();
    const solid = months.filter(p => p.src !== 'p');
    const solidLast = solid.length ? solid[solid.length - 1].ym : null;
    const last12 = new Set(solid.slice(-12).map(p => p.ym));

    // Поставщики: Малайзия и Индонезия — из сведённого ряда, остальные — из GTT.
    const sup = new Map<string, SupplierRow>();
    const add = (code: string, name: string, m: string, t: number, src: 'gtt' | 'both') => {
      const s = sup.get(code) ?? { code, name, byYear: {}, last12: 0, src: 'gtt' as const };
      s.byYear[m.slice(0, 4)] = (s.byYear[m.slice(0, 4)] ?? 0) + t;
      if (last12.has(m)) s.last12 += t;
      if (src === 'both') s.src = 'both';
      sup.set(code, s);
    };
    for (const r of list) {
      if (r.partner === 'MY' || r.partner === 'ID') continue;
      const m = ym(r.year, r.month);
      const pt = months.find(x => x.ym === m);
      if (pt?.src === 'p') continue;
      add(r.partner, partnerName(r.partner, r.partner_name), m, r.qty_t ?? 0, 'gtt');
    }
    for (const p of months) {
      if (p.src === 'p') continue;
      const ctUsed = ctHs && p.src === 'x' && !!ctFirst && p.ym >= ctFirst;
      if (p.my) add('MY', partnerName('MY'), p.ym, p.my, ctUsed ? 'both' : 'gtt');
      if (p.id) add('ID', partnerName('ID'), p.ym, p.id, ctUsed ? 'both' : 'gtt');
    }
    const years = Array.from(new Set(solid.map(p => p.ym.slice(0, 4)))).sort();
    const lastY = years[years.length - 1];
    (out[rep] ??= {})[hs] = {
      months, years, ownLast, myLast, idLast, solidLast,
      suppliers: Array.from(sup.values()).sort((a, b) => b.last12 - a.last12 || (b.byYear[lastY] ?? 0) - (a.byYear[lastY] ?? 0)),
    };
  }
  return out;
}
