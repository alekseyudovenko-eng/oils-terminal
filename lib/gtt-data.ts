// lib/gtt-data.ts — чтение данных о торговле для страницы Лаборатории.
// Грузим по одной стране: так ответ маленький, быстро приходит из базы и помещается в кэш Next.js
// (у unstable_cache лимит 2 МБ на запись — вся таблица целиком в него не влезает).
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';
import { GTT_REPORTERS, type TradeRow } from './gtt-meta';

export type ReporterStatus = { reporter: string; last_available: string | null };
export type ComtradeRowDb = { reporter: string; partner: string; hs: string; period: number; qty_t: number | null; value_usd: number | null };
export type CountryTrade = { rows: TradeRow[]; status: ReporterStatus | null; comtrade: ComtradeRowDb[]; updatedAt: string | null };

const num = (v: unknown) => (v == null ? null : Number(v));

async function loadCountry(reporter: string): Promise<CountryTrade> {
  const db = getDb();
  if (!db) return { rows: [], status: null, comtrade: [], updatedAt: null };
  const iso3 = GTT_REPORTERS.find(r => r.code === reporter)?.iso3;

  const gtt = async () => {
    const rows: TradeRow[] = [];
    let updatedAt: string | null = null;
    for (let from = 0; from < 50000; from += 1000) {
      const { data, error } = await db.from('gtt_trade')
        .select('reporter,partner,partner_name,hs,year,month,value_usd,qty_t,updated_at')
        .eq('flow', 'I').eq('reporter', reporter)
        .order('hs').order('year').order('month').order('partner')
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const r of data || []) {
        rows.push({ ...r, value_usd: num(r.value_usd), qty_t: num(r.qty_t) } as TradeRow);
        if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
      }
      if (!data || data.length < 1000) break;
    }
    return { rows, updatedAt };
  };
  const ct = async () => {
    if (!iso3) return [];
    const { data, error } = await db.from('comtrade_trade')
      .select('reporter,partner,hs,period,qty_t,value_usd')
      .eq('flow', 'X').eq('partner', iso3).limit(5000);
    if (error) throw new Error(error.message);
    return ((data || []) as any[]).map((r: any) => ({ ...r, qty_t: num(r.qty_t), value_usd: num(r.value_usd) })) as ComtradeRowDb[];
  };
  // Последний месяц Comtrade по экспортёру — по всей таблице, а не только по этой стране.
  const ctLast = async () => {
    const [{ data: hi }, { data: lo }] = await Promise.all([
      db.from('comtrade_trade').select('reporter,period').eq('flow', 'X').order('period', { ascending: false }).limit(1000),
      db.from('comtrade_trade').select('period').eq('flow', 'X').order('period', { ascending: true }).limit(1),
    ]);
    const last: Record<string, number> = {};
    for (const r of hi || []) if (!last[r.reporter] || r.period > last[r.reporter]) last[r.reporter] = r.period;
    return { last, first: lo?.[0]?.period as number | undefined };
  };
  const st = async () => {
    const { data } = await db.from('gtt_reporter_status').select('reporter,last_available').eq('reporter', reporter).maybeSingle();
    return (data as ReporterStatus) ?? null;
  };

  const [g, c, cl, s] = await Promise.all([gtt(), ct(), ctLast(), st()]);
  if (!g.rows.length) throw new Error('gtt_trade пуста');
  // Последний месяц Comtrade по каждому экспортёру и первый месяц ряда — служебные строки '_last' / '_first'.
  const marks: ComtradeRowDb[] = Object.entries(cl.last).map(([rep, period]) => ({ reporter: rep, partner: '_last', hs: '', period, qty_t: null, value_usd: null }));
  if (cl.first) marks.push({ reporter: '', partner: '_first', hs: '', period: cl.first, qty_t: null, value_usd: null });
  const comtrade = c.concat(marks);
  return { rows: g.rows, status: s, comtrade, updatedAt: g.updatedAt };
}

const cachedCountry = unstable_cache(loadCountry, ['gtt-country-v2'], { revalidate: 3600, tags: ['gtt'] });

export async function getCountryTrade(reporter: string): Promise<CountryTrade> {
  try { return await cachedCountry(reporter); }
  catch (e) {
    rethrowIfNextInternal(e);
    if (!String((e as Error).message).includes('пуста')) console.error('getCountryTrade:', e);
    return { rows: [], status: null, comtrade: [], updatedAt: null };
  }
}

/** Страны, по которым есть данные, и дата последней загрузки. */
async function loadIndex(): Promise<{ reporters: string[]; updatedAt: string | null }> {
  const db = getDb();
  if (!db) return { reporters: [], updatedAt: null };
  const { data, error } = await db.from('gtt_reporter_status').select('reporter,updated_at');
  if (error) throw new Error(error.message);
  const list = (data || []) as { reporter: string; updated_at: string }[];
  const reporters = list.map(r => r.reporter);
  let updatedAt: string | null = null;
  for (const r of list) if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
  return { reporters, updatedAt };
}
const cachedIndex = unstable_cache(loadIndex, ['gtt-index-v1'], { revalidate: 3600, tags: ['gtt'] });

export async function getTradeIndex() {
  try { return await cachedIndex(); }
  catch (e) { rethrowIfNextInternal(e); console.error('getTradeIndex:', e); return { reporters: [] as string[], updatedAt: null }; }
}
