// lib/gtt.ts — клиент Global Trade Tracker REST API (https://www.globaltradetracker.com/api/).
// Данные GTT лицензированы: показываем их только в закрытой «Лаборатории IMA».
//
// Доступ (переменные окружения Vercel, задаёт владелец подписки):
//   GTT_API_TOKEN — токен из личного кабинета GTT (по документации живёт 14 дней);
//   GTT_USERID + GTT_PASSWORD — необязательно: если заданы, свежий токен берётся
//   через /gettoken при каждом запуске, и замена токена вручную не нужна.

const BASE = 'https://www.globaltradetracker.com/api/rest';

let cached: { token: string; at: number } | null = null;

async function getToken(): Promise<string> {
  const user = process.env.GTT_USERID, pass = process.env.GTT_PASSWORD;
  if (user && pass) {
    if (cached && Date.now() - cached.at < 12 * 3600_000) return cached.token;
    const body = new URLSearchParams({ userid: user, password: pass });
    const res = await fetch(`${BASE}/gettoken`, { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const text = (await res.text()).trim();
    if (!res.ok) throw new Error(`GTT gettoken: HTTP ${res.status}`);
    const token = text.replace(/^"|"$/g, '');
    cached = { token, at: Date.now() };
    return token;
  }
  const token = (process.env.GTT_API_TOKEN || '').trim();
  if (!token) throw new Error('Не задан GTT_API_TOKEN');
  return token;
}

export type GttParams = Record<string, string | number | boolean | undefined>;

/** GET к API GTT с токеном в заголовке. Ответ — JSON (или текст, если не JSON). */
export async function gttGet(path: string, params: GttParams = {}): Promise<any> {
  const token = await getToken();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const res = await fetch(`${BASE}/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(50000),
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* не JSON */ }
  if (!res.ok) {
    const msg = typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300);
    throw new Error(`GTT ${path}: HTTP ${res.status} ${msg}`);
  }
  return data;
}

/** Строка отчёта в формате layout=brief. */
export type GttRow = {
  tradeFlow: string; periodType: string; year: number; month?: number;
  reporterCode: string; reporterName: string; partnerCode?: string; partnerName: string;
  hsCode: string; currency?: string; value?: number; unit1?: string; quantity1?: number;
};

/** Отчёт о торговле: импорт (I) по стране-отчётчику, кодам ТН ВЭД и периоду. */
export async function gttReport(p: GttParams): Promise<GttRow[]> {
  const data = await gttGet('getreport', { layout: 'brief', format: 'json', source: 'DEFAULT', ...p });
  if (Array.isArray(data)) return data;
  for (const k of ['data', 'rows', 'records', 'result']) if (Array.isArray(data?.[k])) return data[k];
  if (data && typeof data === 'object') {
    for (const v of Object.values(data)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v as GttRow[];
  }
  throw new Error(`GTT getreport: неожиданный ответ ${JSON.stringify(data).slice(0, 300)}`);
}
