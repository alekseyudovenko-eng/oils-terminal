// lib/psd.ts — балансы USDA PSD (производство, потребление, импорт, экспорт, запасы).
// Синхронизация: /api/cron/usda-sync раз в месяц, после выхода отчёта WASDE.
// Нужен бесплатный ключ USDA_API_KEY (api.data.gov).
import { unstable_cache } from 'next/cache';
import { rethrowIfNextInternal } from './next-errors';
import { getDb } from './db';

import { METRICS, OILS, WORLD, myLabel, type Metric, type OilId, type PsdRow } from './psd-meta';
export * from './psd-meta';

// ---------------------------------------------------------------- синхронизация

const BASES = ['https://api.fas.usda.gov/api/psd', 'https://apps.fas.usda.gov/OpenData/api/psd'];

async function psdGet(base: string, path: string, key: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json', API_KEY: key, 'X-Api-Key': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`USDA ${path}: HTTP ${res.status}`);
  return res.json();
}

const field = (o: any, ...names: string[]) => {
  for (const n of names) if (o?.[n] != null) return o[n];
  return undefined;
};

export type SyncReport = { base: string; rows: number; log: string[]; errors: string[] };

export async function syncPsd(): Promise<SyncReport> {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error('Не задан USDA_API_KEY (бесплатный ключ: https://api.data.gov/signup/)');
  const db = getDb();
  if (!db) throw new Error('Не заданы переменные Supabase');

  // 1. Находим рабочий адрес API и справочники.
  let base = '';
  let commodities: any[] = [];
  const errors: string[] = [];
  for (const b of BASES) {
    try {
      commodities = await psdGet(b, '/commodities', key);
      base = b;
      break;
    } catch (e: any) {
      errors.push(`${b}: ${e.message}`);
    }
  }
  if (!base) throw new Error(`USDA API недоступен: ${errors.join('; ')}`);

  const [attributes, countries] = await Promise.all([
    psdGet(base, '/commodityAttributes', key).catch(() => []),
    psdGet(base, '/countries', key).catch(() => []),
  ]);

  const oilCodes = new Map<string, OilId>();
  for (const oil of OILS) {
    const found = (commodities as any[]).find(c => {
      const name = String(field(c, 'commodityName', 'CommodityName') || '');
      return /^oil\b|\boil$/i.test(name.split(',')[0].trim()) && oil.match.test(name) && !/kernel|meal|oilseed/i.test(name);
    });
    oilCodes.set(String(field(found, 'commodityCode', 'CommodityCode') || oil.fallbackCode), oil.id);
  }

  const attrIds = new Map<number, Metric>();
  for (const m of METRICS) {
    const found = (attributes as any[]).find(a => m.match.test(String(field(a, 'attributeName', 'AttributeName') || '').trim()));
    attrIds.set(Number(field(found, 'attributeId', 'AttributeId') ?? m.fallbackId), m.id);
  }

  const countryNames = new Map<string, string>();
  for (const c of countries as any[]) {
    const code = field(c, 'countryCode', 'CountryCode');
    if (code) countryNames.set(String(code).trim(), String(field(c, 'countryName', 'CountryName') || code).trim());
  }

  // 2. Загружаем страны и мир за 4 маркетинговых года.
  const year = new Date().getUTCFullYear();
  const years = [year - 2, year - 1, year, year + 1];
  const rows: (PsdRow & { updated_at: string })[] = [];
  const log: string[] = [];
  const now = new Date().toISOString();

  const fetchOil = async (code: string, oil: OilId) => {
    for (const y of years) {
      for (const scope of ['country/all', 'world'] as const) {
        try {
          const data = await psdGet(base, `/commodity/${code}/${scope}/year/${y}`, key);
          let n = 0;
          for (const r of Array.isArray(data) ? data : []) {
            const metric = attrIds.get(Number(field(r, 'attributeId', 'AttributeId')));
            const value = Number(field(r, 'value', 'Value'));
            if (!metric || !Number.isFinite(value)) continue;
            const cc = scope === 'world' ? WORLD : String(field(r, 'countryCode', 'CountryCode') || '').trim();
            if (!cc) continue;
            rows.push({
              commodity: oil, country_code: cc,
              country_name: scope === 'world' ? 'Мир' : countryNames.get(cc) || cc,
              market_year: Number(field(r, 'marketYear', 'MarketYear') || y),
              attribute: metric, value, updated_at: now,
            });
            n++;
          }
          if (n) log.push(`${oil} ${myLabel(y)} ${scope === 'world' ? 'мир' : 'страны'}: ${n}`);
        } catch (e: any) {
          // Будущий год может ещё не существовать — это не ошибка.
          if (y <= year) errors.push(`${oil} ${y} ${scope}: ${e.message}`);
        }
      }
    }
  };
  await Promise.all(Array.from(oilCodes.entries()).map(([code, oil]) => fetchOil(code, oil)));

  // Одна строка на ключ: повтор внутри одной пачки upsert вызывает ошибку Postgres.
  const unique = new Map<string, (typeof rows)[number]>();
  for (const r of rows) unique.set(`${r.commodity}|${r.country_code}|${r.market_year}|${r.attribute}`, r);
  const finalRows = Array.from(unique.values());

  // 3. Записываем пачками.
  let written = 0;
  for (let i = 0; i < finalRows.length; i += 500) {
    const chunk = finalRows.slice(i, i + 500);
    const { error } = await db.from('psd_balances').upsert(chunk, {
      onConflict: 'commodity,country_code,market_year,attribute',
    });
    if (error) errors.push(`upsert: ${error.message}`);
    else written += chunk.length;
  }

  return { base, rows: written, log, errors };
}

// ---------------------------------------------------------------- чтение для страницы

export type PsdData = { rows: PsdRow[]; updatedAt: string | null };

async function loadPsd(): Promise<PsdData> {
  const db = getDb();
  if (!db) return { rows: [], updatedAt: null };
  const minYear = new Date().getUTCFullYear() - 2;
  const rows: PsdRow[] = [];
  let updatedAt: string | null = null;
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await db
      .from('psd_balances')
      .select('commodity,country_code,country_name,market_year,attribute,value,updated_at')
      .gte('market_year', minYear)
      .neq('value', 0)
      .order('commodity')
      .order('country_code')
      .order('market_year')
      .order('attribute')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) {
      rows.push({ ...r, value: Number(r.value) } as PsdRow);
      if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
    }
    if (!data || data.length < 1000) break;
  }
  return { rows, updatedAt };
}

const cachedPsd = unstable_cache(loadPsd, ['psd-v2'], { revalidate: 3600 });

export async function getPsd(): Promise<PsdData> {
  try {
    return await cachedPsd();
  } catch (e) {
    rethrowIfNextInternal(e);
    console.error('getPsd:', e);
    return { rows: [], updatedAt: null };
  }
}
