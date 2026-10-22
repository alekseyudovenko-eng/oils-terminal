// lib/gtt-data.ts — чтение gtt_trade для страницы Лаборатории (кэш 1 час).
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';
import type { TradeRow } from './gtt-meta';

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
