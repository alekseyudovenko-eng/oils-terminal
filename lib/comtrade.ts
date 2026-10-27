// lib/comtrade.ts — клиент UN Comtrade API (https://comtradeplus.un.org).
// Ключ: переменная окружения COMTRADE_API_KEY (бесплатная подписка comtrade - v1).
// Бесплатно: около 500 запросов в день, до 100 тыс. строк за запрос.

const BASE = 'https://comtradeapi.un.org/data/v1/get';

export type ComtradeRow = {
  reporterCode?: number; reporterISO?: string; reporterDesc?: string;
  partnerCode?: number; partnerISO?: string; partnerDesc?: string;
  partner2Code?: number; motCode?: number; customsCode?: string;
  cmdCode?: string; flowCode?: string; period?: string | number;
  primaryValue?: number; netWgt?: number | null; qty?: number | null;
};

/** Итоговые данные (final): товары (C), частота M/A, классификация HS. */
export async function comtradeGet(freq: 'M' | 'A', params: Record<string, string | number | boolean>): Promise<ComtradeRow[]> {
  const key = (process.env.COMTRADE_API_KEY || '').trim();
  if (!key) throw new Error('Не задан COMTRADE_API_KEY');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const res = await fetch(`${BASE}/C/${freq}/HS?${qs}`, {
    headers: { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(50000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Comtrade HTTP ${res.status}: ${text.slice(0, 300)}`);
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Comtrade: не JSON: ${text.slice(0, 200)}`); }
  if (json?.error) throw new Error(`Comtrade: ${String(json.error).slice(0, 300)}`);
  return Array.isArray(json?.data) ? json.data : [];
}

/** Коды M49 экспортёров, которые загружаем. */
export const COMTRADE_EXPORTERS = [
  { code: 458, iso: 'MYS', name: 'Малайзия' },
  { code: 360, iso: 'IDN', name: 'Индонезия' },
];
export const COMTRADE_HS = ['1511', '1513', '1516', '1517'];
