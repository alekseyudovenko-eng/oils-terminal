// lib/indexnow.ts — уведомление Яндекса и Bing о новых и обновлённых страницах по протоколу IndexNow.
// Ключ публичный по правилам протокола: файл public/<ключ>.txt подтверждает, что сайт наш.
import { SITE_URL } from './site';

export const INDEXNOW_KEY = 'a92a22fb8c7015d3c2310bb73aa89c99';
const ENDPOINTS = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];

export async function submitIndexNow(urls: string[]): Promise<Record<string, string>> {
  const list = Array.from(new Set(urls.filter(u => u.startsWith(SITE_URL)))).slice(0, 10000);
  const out: Record<string, string> = {};
  if (!list.length) return out;
  const body = JSON.stringify({
    host: new URL(SITE_URL).host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList: list,
  });
  await Promise.all(ENDPOINTS.map(async ep => {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body, cache: 'no-store', signal: AbortSignal.timeout(20000) });
      out[new URL(ep).host] = `HTTP ${r.status}`;
    } catch (e: any) { out[new URL(ep).host] = String(e?.message || e); }
  }));
  return out;
}
