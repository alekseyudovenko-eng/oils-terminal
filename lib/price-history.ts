// lib/price-history.ts — чтение дневной истории цен для графиков (таблица price_history).
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';

export type HistPoint = { d: string; c: number };

async function load(series: string): Promise<HistPoint[]> {
  const db = getDb();
  if (!db) return [];
  const out: HistPoint[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await db.from('price_history').select('day,close').eq('series', series)
      .order('day').range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) out.push({ d: r.day, c: Number(r.close) });
    if (!data || data.length < 1000) break;
  }
  if (out.length < 2) throw new Error('история пока короткая');
  return out;
}

const cached = unstable_cache(load, ['price-history-v1'], { revalidate: 3600, tags: ['price-history'] });

export async function getPriceHistory(series: string): Promise<HistPoint[]> {
  try { return await cached(series); }
  catch (e) {
    rethrowIfNextInternal(e);
    if (!String((e as any)?.message).includes('короткая')) console.error('getPriceHistory:', e);
    return [];
  }
}
