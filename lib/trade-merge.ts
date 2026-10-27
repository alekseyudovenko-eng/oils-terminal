// lib/trade-merge.ts — сведение источников по импорту одной страны в один ряд.
// Правила:
//  1. Пока есть собственная таможенная статистика страны (GTT, до last_available) — берём её.
//  2. Дальше Малайзия и Индонезия — по их экспорту (UN Comtrade), прочие поставщики — по зеркальной
//     статистике GTT. Месяцы помечаются как «данные экспортёров».
//  3. После последнего месяца Comtrade — только зеркальные данные GTT, они неполные: «предварительно»,
//     в итоги не входят.
// Результат помесячный и по поставщикам — период выбирается уже в браузере.
import type { TradeRow } from './gtt-meta';
import type { ComtradeRowDb, ReporterStatus } from './gtt-data';
import { COMTRADE_HS as CT_HS } from './comtrade';

export type Src = 'c' | 'x' | 'p';
export type MonthPt = { ym: string; my: number; id: number; oth: number; usd: number; src: Src };
export type PartnerSeries = { code: string; name: string; src: 'gtt' | 'both'; t: Record<string, number> };
export type MergedBlock = {
  months: MonthPt[];
  partners: PartnerSeries[];
  ownLast: string | null;   // последний месяц собственной статистики, 'YYYY-MM'
  myLast: string | null;    // последний месяц Comtrade по Малайзии
  idLast: string | null;    // последний месяц Comtrade по Индонезии
  solidLast: string | null; // последний месяц, который идёт в итоги
};
export type CountryMerged = Record<string, MergedBlock>; // код ТН ВЭД → блок

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const fromNum = (n: number) => ym(Math.floor(n / 100), n % 100);

function monthRange(a: string, b: string): string[] {
  const out: string[] = [];
  let [y, m] = a.split('-').map(Number);
  const [ly, lm] = b.split('-').map(Number);
  while (y * 12 + m <= ly * 12 + lm) { out.push(ym(y, m)); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

export function mergeCountry(
  rows: TradeRow[], status: ReporterStatus | null, comtrade: ComtradeRowDb[],
  partnerName: (code: string, fallback?: string | null) => string,
): CountryMerged {
  const ownLast = status?.last_available && /^\d{6}$/.test(status.last_available) ? fromNum(Number(status.last_available)) : null;
  const inOwn = (m: string) => !!ownLast && m <= ownLast;

  const ct = new Map<string, { t: number; usd: number }>();
  const ctLast: Record<string, string> = {};
  let CT_START: string | null = null; // первый месяц загруженного ряда Comtrade
  for (const r of comtrade) {
    const m = fromNum(r.period);
    if (r.partner === '_last') { ctLast[r.reporter] = m; continue; }
    if (r.partner === '_first') { CT_START = m; continue; }
    ct.set(`${r.reporter}|${r.hs}|${m}`, { t: r.qty_t ?? 0, usd: r.value_usd ?? 0 });
  }
  const myLast = ctLast.MYS ?? null, idLast = ctLast.IDN ?? null;

  const byHs = new Map<string, TradeRow[]>();
  for (const r of rows) {
    if (!byHs.has(r.hs)) byHs.set(r.hs, []);
    byHs.get(r.hs)!.push(r);
  }

  const out: CountryMerged = {};
  for (const [hs, list] of Array.from(byHs.entries())) {
    const ctHs = CT_HS.includes(hs);
    // Comtrade покрывает месяц, если он в пределах ряда экспортёра (с начала загрузки Comtrade).
    // Нет строки — значит, в этом месяце экспортёр в эту страну не поставлял (0).
    const covers = (m: string, last: string | null) => ctHs && !!last && m <= last && !!CT_START && m >= CT_START;

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
    if (ctHs) for (const l of [myLast, idLast]) if (l && l > lastM && !inOwn(l)) lastM = l;

    const months: MonthPt[] = monthRange(firstM, lastM).map(m => {
      const p = g.get(m) ?? { t: 0, usd: 0, my: 0, myUsd: 0, id: 0, idUsd: 0 };
      const othT = Math.max(p.t - p.my - p.id, 0), othUsd = Math.max(p.usd - p.myUsd - p.idUsd, 0);
      if (inOwn(m)) return { ym: m, my: p.my, id: p.id, oth: othT, usd: p.usd, src: 'c' as Src };
      const useMy = covers(m, myLast), useId = covers(m, idLast);
      const cMy = useMy ? ct.get(`MYS|${hs}|${m}`) ?? { t: 0, usd: 0 } : null;
      const cId = useId ? ct.get(`IDN|${hs}|${m}`) ?? { t: 0, usd: 0 } : null;
      const my = cMy ? cMy.t : p.my, id = cId ? cId.t : p.id;
      const usd = othUsd + (cMy ? cMy.usd : p.myUsd) + (cId ? cId.usd : p.idUsd);
      const solid = ctHs ? (useMy || useId || (!!CT_START && m < CT_START)) : m < lastGtt; // без Comtrade последний зеркальный месяц неполный
      return { ym: m, my, id, oth: othT, usd, src: (solid ? 'x' : 'p') as Src };
    });
    while (months.length && months[months.length - 1].src === 'p' && months[months.length - 1].my + months[months.length - 1].id + months[months.length - 1].oth === 0) months.pop();
    const srcOf = new Map(months.map(p => [p.ym, p.src]));
    const solid = months.filter(p => p.src !== 'p');

    // Поставщики помесячно: Малайзия и Индонезия — из сведённого ряда, остальные — из GTT.
    const partners = new Map<string, PartnerSeries>();
    const add = (code: string, name: string, m: string, t: number, both: boolean) => {
      if (!t) return;
      const s = partners.get(code) ?? { code, name, src: 'gtt' as const, t: {} };
      s.t[m] = (s.t[m] ?? 0) + Math.round(t);
      if (both) s.src = 'both';
      partners.set(code, s);
    };
    for (const r of list) {
      if (r.partner === 'MY' || r.partner === 'ID') continue;
      const m = ym(r.year, r.month);
      if (srcOf.get(m) === 'p') continue;
      add(r.partner, partnerName(r.partner, r.partner_name), m, r.qty_t ?? 0, false);
    }
    for (const p of months) {
      if (p.src === 'p') continue;
      const both = p.src === 'x' && ctHs && !!CT_START && p.ym >= CT_START;
      add('MY', partnerName('MY'), p.ym, p.my, both);
      add('ID', partnerName('ID'), p.ym, p.id, both);
    }
    out[hs] = {
      months: months.map(p => ({ ...p, my: Math.round(p.my), id: Math.round(p.id), oth: Math.round(p.oth), usd: Math.round(p.usd) })),
      partners: Array.from(partners.values()),
      ownLast, myLast, idLast, solidLast: solid.length ? solid[solid.length - 1].ym : null,
    };
  }
  return out;
}
