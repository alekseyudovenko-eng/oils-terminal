// lib/country-sources.ts — платные и внутренние источники для страниц стран (только «Лаборатория»):
// Oil World (балансы масел и жиров), MPOB (экспорт Малайзии по странам), заметки IMA/MPOC.
// Данные лежат в Supabase: oilworld_balance, mpob_exports, country_notes. В публичный репозиторий не попадают.
import { unstable_cache } from 'next/cache';
import { getDb } from './db';
import { rethrowIfNextInternal } from './next-errors';

export type OwRow = { section: string; item: string; season: string; forecast: boolean; value: number; scope: string };
export type OwData = { edition: string | null; seasons: string[]; rows: OwRow[] };
export type MpobRow = { period: string; year: number; product_group: string; product: string; volume_t: number | null; value_rm_mil: number | null };
export type Note = { topic: string; text_ru: string; text_en: string; source: string; source_date: string | null; source_kind: string };
export type CountrySources = { ow: OwData; mpob: MpobRow[]; notes: Note[] };

const EMPTY: CountrySources = { ow: { edition: null, seasons: [], rows: [] }, mpob: [], notes: [] };

async function load(code: string): Promise<CountrySources> {
  const db = getDb();
  if (!db) return EMPTY;
  const [ed, mp, nt] = await Promise.all([
    db.from('oilworld_balance').select('edition').eq('country', code).order('edition', { ascending: false }).limit(1),
    db.from('mpob_exports').select('period,year,product_group,product,volume_t,value_rm_mil').eq('country', code).limit(1000),
    db.from('country_notes').select('topic,text_ru,text_en,source,source_date,source_kind').eq('country', code).order('sort').limit(100),
  ]);
  const edition = (ed.data?.[0]?.edition as string | undefined) ?? null;
  let rows: OwRow[] = [];
  if (edition) {
    const { data, error } = await db.from('oilworld_balance')
      .select('section,item,season,forecast,value,scope').eq('country', code).eq('edition', edition).limit(2000);
    if (error) throw new Error(error.message);
    rows = ((data || []) as any[]).map(r => ({ ...r, value: Number(r.value) }));
  }
  const seasons = Array.from(new Set(rows.map(r => r.season))).sort(); // '22/23' … '26/27'
  return {
    ow: { edition, seasons, rows },
    mpob: ((mp.data || []) as any[]).map(r => ({ ...r, volume_t: r.volume_t == null ? null : Number(r.volume_t), value_rm_mil: r.value_rm_mil == null ? null : Number(r.value_rm_mil) })),
    notes: (nt.data || []) as Note[],
  };
}

const cached = unstable_cache(load, ['country-sources-v1'], { revalidate: 3600, tags: ['country-sources'] });

export async function getCountrySources(code: string): Promise<CountrySources> {
  try { return await cached(code); }
  catch (e) { rethrowIfNextInternal(e); console.error('getCountrySources:', e); return EMPTY; }
}

/** Значение баланса Oil World. */
export const owVal = (ow: OwData, section: string, item: string, season: string) =>
  ow.rows.find(r => r.section === section && r.item === item && r.season === season)?.value ?? null;
