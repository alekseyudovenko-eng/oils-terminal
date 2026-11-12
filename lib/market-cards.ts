// lib/market-cards.ts — данные для карточки MPOB и блока «Регион» (только публичные источники).
//  • MPOB: таблица mpob_monthly_public — цифры из публичного ежемесячного релиза MPOB (через СМИ).
//  • Регион: UN Comtrade, экспорт Малайзии и Индонезии (HS 1511, 1513, 1516, 1517) в страны региона.
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';

export type MpobMonth = {
  month: string; stocks_t: number | null; production_t: number | null; exports_t: number | null;
  stocks_mom_pct: number | null; production_mom_pct: number | null; exports_mom_pct: number | null;
  stocks_yoy_pct: number | null; production_yoy_pct: number | null; exports_yoy_pct: number | null;
  released_on: string | null; source_url: string | null;
};

async function loadMpob(): Promise<MpobMonth | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db.from('mpob_monthly_public').select('*').order('month', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MpobMonth) ?? null;
}
const cachedMpob = unstable_cache(loadMpob, ['mpob-public-v1'], { revalidate: 3600, tags: ['mpob-public'] });
export async function getMpobLatest(): Promise<MpobMonth | null> {
  try { return await cachedMpob(); } catch (e) { rethrowIfNextInternal(e); console.error('getMpobLatest:', e); return null; }
}

/** Страны блока «Регион» (ISO3) в порядке показа. */
export const REGION_COUNTRIES = ['RUS', 'UZB', 'KAZ', 'KGZ', 'TJK', 'TKM', 'AZE', 'GEO', 'ARM', 'UKR', 'BLR', 'TUR'] as const;

export type RegionRow = { iso: string; full: number; fullMy: number; ytd: number; ytdPrev: number };
export type RegionData = { year: number; fullYear: number; ytdMonth: number; rows: RegionRow[] };

async function loadRegion(): Promise<RegionData | null> {
  const db = getDb();
  if (!db) return null;
  const year = new Date().getUTCFullYear();
  const rows: { reporter: string; partner: string; period: number; qty_t: number | null }[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await db.from('comtrade_trade').select('reporter,partner,period,qty_t')
      .eq('flow', 'X').in('partner', REGION_COUNTRIES as unknown as string[]).gte('period', (year - 1) * 100 + 1)
      .order('period').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as any));
    if (!data || data.length < 1000) break;
  }
  if (!rows.length) throw new Error('нет данных Comtrade');
  // Общий последний месяц текущего года у обоих экспортёров (Индонезия публикуется позже).
  const lastBy = (r: string) => Math.max(0, ...rows.filter(x => x.reporter === r && Math.floor(x.period / 100) === year).map(x => x.period % 100));
  const ytdMonth = Math.min(lastBy('MYS'), lastBy('IDN'));
  const fullYear = year - 1;
  const out: RegionRow[] = REGION_COUNTRIES.map(iso => {
    const mine = rows.filter(x => x.partner === iso);
    const sum = (f: (x: typeof rows[number]) => boolean) => mine.filter(f).reduce((a, x) => a + Number(x.qty_t || 0), 0) / 1000;
    return {
      iso,
      full: sum(x => Math.floor(x.period / 100) === fullYear),
      fullMy: sum(x => x.reporter === 'MYS' && Math.floor(x.period / 100) === fullYear),
      ytd: sum(x => Math.floor(x.period / 100) === year && x.period % 100 <= ytdMonth),
      ytdPrev: sum(x => Math.floor(x.period / 100) === fullYear && x.period % 100 <= ytdMonth),
    };
  }).filter(r => r.full > 0.05 || r.ytd > 0.05);
  return { year, fullYear, ytdMonth, rows: out };
}
const cachedRegion = unstable_cache(loadRegion, ['region-trade-v1'], { revalidate: 6 * 3600, tags: ['comtrade'] });
export async function getRegionTrade(): Promise<RegionData | null> {
  try { return await cachedRegion(); } catch (e) { rethrowIfNextInternal(e); console.error('getRegionTrade:', e); return null; }
}
