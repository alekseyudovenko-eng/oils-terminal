// Еженедельный сбор аналитики: TGStat (@oilpalm) + проверка сайта.
// Запуск: TGSTAT_TOKEN=... node scripts/analytics/collect.mjs
// Результат: analytics-out/YYYY-MM-DD.json. Токен берётся только из переменной окружения
// и нигде не печатается. TGStat: ровно 4 запроса за запуск (лимит бесплатного тарифа — 50/мес).
import { mkdirSync, writeFileSync } from 'node:fs';

const SITE = process.env.SITE_URL || 'https://imaoils.vercel.app';
const CHANNEL = process.env.TG_CHANNEL || '@oilpalm';
const TOKEN = process.env.TGSTAT_TOKEN || '';
const API = 'https://api.tgstat.ru';
const day = new Date().toISOString().slice(0, 10);
const out = { collectedAt: new Date().toISOString(), channel: CHANNEL, tgstat: {}, site: {} };

async function tg(method, params = {}) {
  if (!TOKEN) return { ok: false, error: 'TGSTAT_TOKEN не задан' };
  const q = new URLSearchParams({ token: TOKEN, channelId: CHANNEL, ...params });
  try {
    const r = await fetch(`${API}/${method}?${q}`, { signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.status !== 'ok') {
      return { ok: false, error: `HTTP ${r.status}: ${j?.error || 'нет ответа'}` };
    }
    return { ok: true, data: j.response };
  } catch (e) {
    return { ok: false, error: String(e.message || e).replaceAll(TOKEN, '***') };
  }
}

const week = Math.floor(Date.now() / 1000) - 7 * 86400;
out.tgstat.stat = await tg('channels/stat');
out.tgstat.subscribers = await tg('channels/subscribers', { group: 'day', startDate: week, endDate: Math.floor(Date.now() / 1000) });
out.tgstat.posts = await tg('channels/posts', { limit: 30, startTime: week });
out.tgstat.mentions = await tg('channels/mentions', { limit: 10, startDate: week });

// Здоровье сайта
for (const p of ['/', '/market', '/api/quotes', '/api/snapshot']) {
  try {
    const r = await fetch(SITE + p, { signal: AbortSignal.timeout(30000) });
    out.site[p] = { status: r.status, bytes: (await r.arrayBuffer()).byteLength };
  } catch (e) {
    out.site[p] = { error: String(e.message || e) };
  }
}
try {
  const q = await (await fetch(SITE + '/api/quotes', { signal: AbortSignal.timeout(30000) })).json();
  out.site.quotesFetchedAt = q.fetchedAt;
  out.site.quotesNull = (q.quotes || []).filter(x => x.price == null).map(x => x.id);
} catch {}

mkdirSync('analytics-out', { recursive: true });
writeFileSync(`analytics-out/${day}.json`, JSON.stringify(out, null, 2));
const failed = Object.entries(out.tgstat).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.error}`);
console.log(failed.length ? `TGStat: ошибки — ${failed.join('; ')}` : 'TGStat: все 4 запроса успешны');
