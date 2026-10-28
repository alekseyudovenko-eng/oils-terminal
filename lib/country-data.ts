// lib/country-data.ts — открытые данные по странам: Всемирный банк (WDI, WGI), МВФ (прогнозы), курсы (TradingView).
// Кэш на сутки (курсы — на час). Ошибки источника не роняют страницу — блок просто пустой.
import { unstable_cache } from 'next/cache';
import { rethrowIfNextInternal } from './next-errors';

export type Obs = { value: number; year: string } | null;

export const WDI = {
  pop: 'SP.POP.TOTL', area: 'AG.SRF.TOTL.K2', urban: 'SP.URB.TOTL.IN.ZS',
  gdp: 'NY.GDP.MKTP.CD', gdppc: 'NY.GDP.PCAP.CD', growth: 'NY.GDP.MKTP.KD.ZG', cpi: 'FP.CPI.TOTL.ZG',
  trade: 'NE.TRD.GNFS.ZS', cab: 'BN.CAB.XOKA.GD.ZS', reserves: 'FI.RES.TOTL.CD', remit: 'BX.TRF.PWKR.DT.GD.ZS',
} as const;
export const WGI = {
  pv: 'GOV_WGI_PV.EST', ge: 'GOV_WGI_GE.EST', rq: 'GOV_WGI_RQ.EST', rl: 'GOV_WGI_RL.EST', cc: 'GOV_WGI_CC.EST',
} as const;
export type WdiKey = keyof typeof WDI;
export type WgiKey = keyof typeof WGI;

async function wb(indicator: string, iso3: string[], source?: number): Promise<Record<string, Obs>> {
  const url = `https://api.worldbank.org/v2/country/${iso3.join(';')}/indicator/${indicator}?format=json&mrnev=1&per_page=100${source ? `&source=${source}` : ''}`;
  const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`World Bank ${indicator}: HTTP ${res.status}`);
  const json = await res.json();
  const out: Record<string, Obs> = {};
  for (const r of (Array.isArray(json) && json[1]) || []) {
    if (r?.value != null) out[r.countryiso3code] = { value: Number(r.value), year: String(r.date) };
  }
  return out;
}

/** Ряд за несколько лет (для динамики роста и инфляции). */
async function wbSeries(indicator: string, iso3: string[], from: number, to: number): Promise<Record<string, Record<string, number>>> {
  const url = `https://api.worldbank.org/v2/country/${iso3.join(';')}/indicator/${indicator}?format=json&date=${from}:${to}&per_page=500`;
  const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`World Bank ${indicator}: HTTP ${res.status}`);
  const json = await res.json();
  const out: Record<string, Record<string, number>> = {};
  for (const r of (Array.isArray(json) && json[1]) || []) {
    if (r?.value != null) (out[r.countryiso3code] ??= {})[String(r.date)] = Number(r.value);
  }
  return out;
}

/** Прогнозы МВФ (World Economic Outlook) через DataMapper: рост ВВП и инфляция. */
async function imf(indicator: string): Promise<Record<string, Record<string, number>>> {
  const res = await fetch(`https://www.imf.org/external/datamapper/api/v1/${indicator}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`IMF ${indicator}: HTTP ${res.status}`);
  const json = await res.json();
  return (json?.values?.[indicator] ?? {}) as Record<string, Record<string, number>>;
}

export type MacroData = {
  wdi: Record<string, Partial<Record<WdiKey, Obs>>>;   // iso3 → показатель
  wgi: Record<string, Partial<Record<WgiKey, Obs>>>;
  growthSeries: Record<string, Record<string, number>>;
  cpiSeries: Record<string, Record<string, number>>;
  imfGrowth: Record<string, Record<string, number>>;
  imfCpi: Record<string, Record<string, number>>;
};

async function loadMacro(iso3: string[]): Promise<MacroData> {
  const settle = async <T,>(p: Promise<T>, empty: T): Promise<T> => { try { return await p; } catch (e) { console.warn('country-data:', (e as Error).message); return empty; } };
  const year = new Date().getUTCFullYear();
  const wdiKeys = Object.keys(WDI) as WdiKey[];
  const wgiKeys = Object.keys(WGI) as WgiKey[];
  const [wdiRes, wgiRes, growthSeries, cpiSeries, imfAll] = await Promise.all([
    Promise.all(wdiKeys.map(k => settle(wb(WDI[k], iso3), {} as Record<string, Obs>))),
    Promise.all(wgiKeys.map(k => settle(wb(WGI[k], iso3, 3), {} as Record<string, Obs>))),
    settle(wbSeries(WDI.growth, iso3, year - 6, year), {}),
    settle(wbSeries(WDI.cpi, iso3, year - 6, year), {}),
    Promise.all([settle(imf('NGDP_RPCH'), {}), settle(imf('PCPIPCH'), {})]),
  ]);
  const wdi: MacroData['wdi'] = {}, wgi: MacroData['wgi'] = {};
  for (const c of iso3) {
    wdi[c] = {}; wgi[c] = {};
    wdiKeys.forEach((k, i) => { wdi[c][k] = wdiRes[i][c] ?? null; });
    wgiKeys.forEach((k, i) => { wgi[c][k] = wgiRes[i][c] ?? null; });
  }
  const pick = (all: Record<string, Record<string, number>>) => Object.fromEntries(iso3.map(c => [c, all[c] ?? {}]));
  return { wdi, wgi, growthSeries, cpiSeries, imfGrowth: pick(imfAll[0]), imfCpi: pick(imfAll[1]) };
}

const cachedMacro = unstable_cache(async (key: string) => loadMacro(key.split(',')), ['country-macro-v1'], { revalidate: 86400 });

export async function getMacro(iso3: string[]): Promise<MacroData> {
  try { return await cachedMacro([...iso3].sort().join(',')); }
  catch (e) { rethrowIfNextInternal(e); console.error('getMacro:', e); return { wdi: {}, wgi: {}, growthSeries: {}, cpiSeries: {}, imfGrowth: {}, imfCpi: {} }; }
}

export type Fx = { rate: number; chg1m: number | null; chgYtd: number | null } | null;

async function loadFx(tickers: string[]): Promise<Record<string, Fx>> {
  const res = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: 'https://www.tradingview.com', Referer: 'https://www.tradingview.com/' },
    body: JSON.stringify({ symbols: { tickers, query: { types: [] } }, columns: ['close', 'Perf.1M', 'Perf.YTD'] }),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`TradingView HTTP ${res.status}`);
  const json = await res.json();
  const out: Record<string, Fx> = {};
  for (const it of json?.data || []) {
    const d = it.d || [];
    if (typeof d[0] === 'number') out[it.s] = { rate: d[0], chg1m: typeof d[1] === 'number' ? d[1] : null, chgYtd: typeof d[2] === 'number' ? d[2] : null };
  }
  return out;
}

const cachedFx = unstable_cache(async (key: string) => loadFx(key.split(',')), ['country-fx-v1'], { revalidate: 3600 });

export async function getFx(tickers: string[]): Promise<Record<string, Fx>> {
  if (!tickers.length) return {};
  try { return await cachedFx([...tickers].sort().join(',')); }
  catch (e) { rethrowIfNextInternal(e); console.error('getFx:', e); return {}; }
}
