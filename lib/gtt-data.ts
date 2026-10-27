// lib/gtt-data.ts — чтение gtt_trade для страницы Лаборатории (кэш 1 час).
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';
import { GTT_REPORTERS, type TradeRow } from './gtt-meta';

const ISO3_LIST = GTT_REPORTERS.map(r => r.iso3);

async function load(): Promise<{ rows: TradeRow[]; updatedAt: string | null }> {
  const db = getDb();
  if (!db) return { rows: [], updatedAt: null };
  const rows: TradeRow[] = [];
  let updatedAt: string | null = null;
  for (let from = 0; from < 200000; from += 1000) {
    const { data, error } = await db.from('gtt_trade')
      .select('reporter,partner,partner_name,hs,year,month,value_usd,qty_t,updated_at')
      .eq('flow', 'I').order('reporter').order('hs').order('year').order('month').order('partner')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) {
      rows.push({ ...r, value_usd: r.value_usd == null ? null : Number(r.value_usd), qty_t: r.qty_t == null ? null : Number(r.qty_t) } as TradeRow);
      if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
    }
    if (!data || data.length < 1000) break;
  }
  if (!rows.length) throw new Error('gtt_trade пуста');
  return { rows, updatedAt };
}

const cached = unstable_cache(load, ['gtt-trade-v1'], { revalidate: 3600, tags: ['gtt'] });

export async function getTrade() {
  try { return await cached(); }
  catch (e) {
    rethrowIfNextInternal(e);
    if (!String((e as Error).message).includes('пуста')) console.error('getTrade:', e);
    return { rows: [] as TradeRow[], updatedAt: null };
  }
}

// ── Статус собственных данных стран и экспорт по UN Comtrade ─────────────────

export type ReporterStatus = { reporter: string; last_available: string | null };
export type ComtradeRowDb = { reporter: string; partner: string; hs: string; period: number; qty_t: number | null; value_usd: number | null };

async function loadExtra(): Promise<{ status: ReporterStatus[]; comtrade: ComtradeRowDb[] }> {
  const db = getDb();
  if (!db) return { status: [], comtrade: [] };
  const { data: st, error: e1 } = await db.from('gtt_reporter_status').select('reporter,last_available');
  if (e1) throw new Error(e1.message);
  const comtrade: ComtradeRowDb[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await db.from('comtrade_trade')
      .select('reporter,partner,hs,period,qty_t,value_usd')
      .eq('flow', 'X').in('partner', ISO3_LIST)
      .order('reporter').order('partner').order('hs').order('period')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) comtrade.push({ ...r, qty_t: r.qty_t == null ? null : Number(r.qty_t), value_usd: r.value_usd == null ? null : Number(r.value_usd) } as ComtradeRowDb);
    if (!data || data.length < 1000) break;
  }
  return { status: (st || []) as ReporterStatus[], comtrade };
}

const cachedExtra = unstable_cache(loadExtra, ['trade-extra-v1'], { revalidate: 3600, tags: ['gtt'] });

export async function getTradeExtra() {
  try { return await cachedExtra(); }
  catch (e) {
    rethrowIfNextInternal(e);
    console.error('getTradeExtra:', e);
    return { status: [] as ReporterStatus[], comtrade: [] as ComtradeRowDb[] };
  }
}
