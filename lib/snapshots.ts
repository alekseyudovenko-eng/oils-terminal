// lib/snapshots.ts — ежедневные снимки цен и спредов (для графика POGO на странице «Рынок»).
import { unstable_cache } from 'next/cache';
import { rethrowIfNextInternal } from './next-errors';
import { getDb } from './db';
import type { QuotesResult } from './quotes';

export async function saveSnapshot(q: QuotesResult): Promise<{ saved: number; error: string | null }> {
  const db = getDb();
  if (!db) return { saved: 0, error: 'Не заданы переменные Supabase' };
  const day = q.fetchedAt.slice(0, 10);
  const rows = [
    ...q.quotes.filter(x => x.price != null).map(x => ({
      day, series: x.id, price: x.price, usd_t: x.usdT, ticker: x.ticker,
    })),
    ...q.spreads.filter(s => s.value != null).map(s => ({
      day, series: s.id, price: s.value, usd_t: s.value, ticker: s.proxy ? 'proxy:ulsd' : null,
    })),
  ];
  if (rows.length === 0) return { saved: 0, error: 'Нет данных для сохранения' };
  const { error } = await db.from('price_snapshots').upsert(rows, { onConflict: 'day,series' });
  return { saved: error ? 0 : rows.length, error: error?.message ?? null };
}

export type Point = { day: string; value: number };

async function loadHistory(series: string): Promise<Point[]> {
  const db = getDb();
  if (!db) return [];
  const since = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from('price_snapshots')
    .select('day, usd_t')
    .eq('series', series)
    .gte('day', since)
    .order('day');
  if (error) throw new Error(error.message);
  const points = (data || []).filter((r: any) => r.usd_t != null).map((r: any) => ({ day: r.day, value: Number(r.usd_t) }));
  // Меньше двух точек — график не строится; не кэшируем, чтобы новые снимки появлялись сразу.
  if (points.length < 2) throw new Error('история пока короткая');
  return points;
}

const cachedHistory = unstable_cache(loadHistory, ['history-v3'], { revalidate: 3600 });

export async function getHistory(series: string): Promise<Point[]> {
  try {
    return await cachedHistory(series);
  } catch (e) {
    rethrowIfNextInternal(e);
    if (!String((e as any)?.message).includes('короткая')) console.error('getHistory:', e);
    return [];
  }
}

/** Значение ряда примерно `daysAgo` дней назад (ближайший снимок в пределах ±3 дней), без кэша. */
export async function valueDaysAgo(series: string, daysAgo: number): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  const target = Date.now() - daysAgo * 86400_000;
  const from = new Date(target - 3 * 86400_000).toISOString().slice(0, 10);
  const to = new Date(target + 3 * 86400_000).toISOString().slice(0, 10);
  const { data } = await db.from('price_snapshots').select('day, usd_t').eq('series', series).gte('day', from).lte('day', to);
  const rows = (data || []).filter((r: any) => r.usd_t != null);
  if (rows.length === 0) return null;
  rows.sort((a: any, b: any) => Math.abs(Date.parse(a.day) - target) - Math.abs(Date.parse(b.day) - target));
  return Number(rows[0].usd_t);
}
