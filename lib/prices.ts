// lib/prices.ts — сбор цен и запись в таблицу market_data.
// Используется cron-маршрутом /api/cron/daily-update и кнопкой обновления на главной.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** 1 цент/фунт = 22.0462 USD за метрическую тонну (2204.62 фунта / 100). */
const CENTS_LB_TO_USD_MT = 22.0462;

/** Разумный диапазон фьючерса FCPO в ринггитах. Всё, что вне его, считаем ошибкой парсинга. */
const FCPO_MYR_RANGE = { min: 2000, max: 8000 };

/** Названия товаров — единые для записи в базу и для порядка в таблице на главной. */
export const COMMODITIES = {
  soy: 'Soybean Oil CBOT (Chicago)',
  fcpo: 'CPO Futures (Bursa Malaysia)',
  indoRef: 'CPO Reference Price (Indonesia)',
} as const;

export type PriceRow = {
  commodity: string;
  value: number;
  currency: 'USD';
  unit: 'USD/MT';
  metric: 'price_spot' | 'price_futures' | 'price_reference';
  verified_at: string;
  sources: { source: string; note?: string }[];
};

export type UpdateResult = {
  updated: string[];
  skipped: { commodity: string; reason: string }[];
  errors: { commodity: string; error: string }[];
  fx: { MYR_per_USD: number | null; source: string };
};

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Не заданы NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
};

/** Живой курс MYR за 1 USD. Без курса цену FCPO не пишем, чтобы не сохранить неверную цифру. */
async function getMyrPerUsd(): Promise<{ rate: number | null; source: string }> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    const data = await res.json();
    const rate = Number(data?.rates?.MYR);
    if (rate > 2 && rate < 8) return { rate, source: 'open.er-api.com' };
  } catch (e) {
    console.error('FX error:', e);
  }
  // Запасной вариант: курс, заданный вручную в переменных окружения Vercel.
  const manual = Number(process.env.FX_MYR_PER_USD);
  if (manual > 2 && manual < 8) return { rate: manual, source: 'FX_MYR_PER_USD (env)' };
  return { rate: null, source: 'unavailable' };
}

/** Соевое масло CBOT, ближайший фьючерс ZL=F (центы/фунт) → USD/т. */
async function getSoybeanOil(): Promise<number> {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/ZL=F?interval=1d&range=1d',
    { headers: BROWSER_HEADERS, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  const cents = Number(data?.chart?.result?.[0]?.meta?.regularMarketPrice);
  // Цена соевого масла в центах/фунт исторически в диапазоне ~20–100.
  if (!(cents > 10 && cents < 150)) throw new Error(`Подозрительная цена ZL=F: ${cents}`);
  return +(cents * CENTS_LB_TO_USD_MT).toFixed(2);
}

/**
 * FCPO с сайта Bursa Malaysia (в ринггитах). Парсинг HTML ненадёжен,
 * поэтому число проверяется на разумный диапазон. Источник стоит заменить на API.
 */
async function getFcpoMyr(): Promise<number> {
  const res = await fetch('https://www.bursamalaysia.com/market_information/derivatives_prices', {
    headers: BROWSER_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Bursa HTTP ${res.status}`);
  const html = await res.text();
  const idx = html.indexOf('FCPO');
  if (idx === -1) throw new Error('На странице Bursa не найден FCPO (возможно, данные грузятся скриптом)');

  const snippet = html.substring(idx, idx + 800).replace(/<[^>]+>/g, ' ');
  // Цены вида 4123, 4,123 или 4123.00
  const candidates = snippet.match(/\b\d{1,2},?\d{3}(?:\.\d{1,2})?\b/g) || [];
  for (const raw of candidates) {
    const v = parseFloat(raw.replace(/,/g, ''));
    if (v >= FCPO_MYR_RANGE.min && v <= FCPO_MYR_RANGE.max) return v;
  }
  throw new Error('Цена FCPO не найдена в разумном диапазоне');
}

/** Официальная референсная цена Индонезии (заполняется вручную в таблице indonesia_official_rates). */
async function getIndonesiaReference(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('indonesia_official_rates')
    .select('reference_price_usd')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  const v = Number(data?.reference_price_usd);
  if (!(v > 0)) throw new Error('Нет значения reference_price_usd');
  return v;
}

/** Собирает все цены и записывает их в market_data (одна строка на товар). */
export async function updatePrices(supabase: SupabaseClient = getAdminClient()): Promise<UpdateResult> {
  const now = new Date().toISOString();
  const result: UpdateResult = { updated: [], skipped: [], errors: [], fx: { MYR_per_USD: null, source: '' } };
  const rows: PriceRow[] = [];

  const [soy, fcpo, indo, fx] = await Promise.allSettled([
    getSoybeanOil(),
    getFcpoMyr(),
    getIndonesiaReference(supabase),
    getMyrPerUsd(),
  ]);

  const fxRate = fx.status === 'fulfilled' ? fx.value.rate : null;
  result.fx = { MYR_per_USD: fxRate, source: fx.status === 'fulfilled' ? fx.value.source : 'error' };

  if (soy.status === 'fulfilled') {
    rows.push({
      commodity: COMMODITIES.soy, value: soy.value, currency: 'USD', unit: 'USD/MT',
      metric: 'price_spot', verified_at: now, sources: [{ source: 'Yahoo Finance (ZL=F)' }],
    });
  } else {
    result.skipped.push({ commodity: COMMODITIES.soy, reason: String(soy.reason?.message || soy.reason) });
  }

  if (fcpo.status === 'fulfilled' && fxRate) {
    rows.push({
      commodity: COMMODITIES.fcpo, value: +(fcpo.value / fxRate).toFixed(2), currency: 'USD', unit: 'USD/MT',
      metric: 'price_futures', verified_at: now,
      sources: [{ source: 'Bursa Malaysia', note: `${fcpo.value} MYR @ ${fxRate.toFixed(4)} MYR/USD` }],
    });
  } else {
    const reason = fcpo.status === 'rejected' ? String(fcpo.reason?.message || fcpo.reason) : 'нет курса MYR/USD';
    result.skipped.push({ commodity: COMMODITIES.fcpo, reason });
  }

  if (indo.status === 'fulfilled') {
    rows.push({
      commodity: COMMODITIES.indoRef, value: indo.value, currency: 'USD', unit: 'USD/MT',
      metric: 'price_reference', verified_at: now, sources: [{ source: 'Indonesia MoT (manual)' }],
    });
  } else {
    result.skipped.push({ commodity: COMMODITIES.indoRef, reason: String(indo.reason?.message || indo.reason) });
  }

  for (const row of rows) {
    const { error } = await supabase.from('market_data').upsert(row, { onConflict: 'commodity' });
    if (error) result.errors.push({ commodity: row.commodity, error: error.message });
    else result.updated.push(row.commodity);
  }

  return result;
}

/** Время последнего обновления любой цены (для ограничения частоты ручного обновления). */
export async function lastPriceUpdate(supabase: SupabaseClient): Promise<Date | null> {
  const { data } = await supabase
    .from('market_data')
    .select('verified_at')
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.verified_at ? new Date(data.verified_at) : null;
}
