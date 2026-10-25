// lib/facebook.ts — публикация картинки на страницу Facebook без участия Claude.
// Два способа (используется первый настроенный):
//  1) Напрямую через Facebook Graph API: FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (бессрочный токен страницы).
//  2) Через Metricool API: METRICOOL_USER_TOKEN + METRICOOL_USER_ID (+ METRICOOL_BLOG_ID, по умолчанию 7560891).
// Ничего не настроено — возвращает { ok: false, error: 'not configured' }, Telegram при этом работает как раньше.

export type FacebookResult = { ok: boolean; via?: 'graph' | 'metricool'; id?: string; error?: string };

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v21.0';
const METRICOOL_API = 'https://app.metricool.com/api';
const METRICOOL_TZ = process.env.METRICOOL_TIMEZONE || 'Asia/Jerusalem';

export function facebookConfigured(): boolean {
  return !!(
    (process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) ||
    (process.env.METRICOOL_USER_TOKEN && process.env.METRICOOL_USER_ID)
  );
}

/** Фото с подписью на страницу. png — сама картинка (для Graph API), imageUrl — её публичный адрес (для Metricool). */
export async function postFacebookPhoto(png: ArrayBuffer, imageUrl: string, text: string): Promise<FacebookResult> {
  const pageId = (process.env.FB_PAGE_ID || '').trim();
  const pageToken = (process.env.FB_PAGE_ACCESS_TOKEN || '').trim();
  if (pageId && pageToken) return postViaGraph(pageId, pageToken, png, text);
  const mcToken = (process.env.METRICOOL_USER_TOKEN || '').trim();
  const mcUser = (process.env.METRICOOL_USER_ID || '').trim();
  if (mcToken && mcUser) return postViaMetricool(mcToken, mcUser, imageUrl, text);
  return { ok: false, error: 'not configured' };
}

async function postViaGraph(pageId: string, token: string, png: ArrayBuffer, text: string): Promise<FacebookResult> {
  const form = new FormData();
  form.append('caption', text);
  form.append('published', 'true');
  form.append('access_token', token);
  form.append('source', new Blob([png], { type: 'image/png' }), 'IMA_Daily_Snapshot.png');
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`, { method: 'POST', body: form, cache: 'no-store' });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { ok: false, via: 'graph', error: data.error?.message || `HTTP ${res.status}` };
    return { ok: true, via: 'graph', id: data.post_id || data.id };
  } catch (e: any) {
    return { ok: false, via: 'graph', error: String(e?.message || e) };
  }
}

/** Местное время в часовом поясе бренда в виде YYYY-MM-DDTHH:mm:ss (так его ждёт Metricool). */
function localDateTime(d: Date, timeZone: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map(x => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

async function postViaMetricool(token: string, userId: string, imageUrl: string, text: string): Promise<FacebookResult> {
  const blogId = (process.env.METRICOOL_BLOG_ID || '7560891').trim();
  const qs = `blogId=${encodeURIComponent(blogId)}&userId=${encodeURIComponent(userId)}`;
  const headers = { 'X-Mc-Auth': token, 'Content-Type': 'application/json' };
  try {
    // Metricool сначала забирает картинку к себе (static.metricool.com); если не вышло — отдаём исходный адрес.
    let media = imageUrl;
    const norm = await fetch(`${METRICOOL_API}/actions/normalize/image/url?url=${encodeURIComponent(imageUrl)}&${qs}`, { headers, cache: 'no-store' });
    if (norm.ok) {
      const body = (await norm.text()).trim().replace(/^"|"$/g, '');
      if (/^https?:\/\//.test(body)) media = body;
    }
    // Публикация через 3 минуты: прошедшее время Metricool не принимает.
    const when = localDateTime(new Date(Date.now() + 3 * 60_000), METRICOOL_TZ);
    const post = {
      autoPublish: true, draft: false, descendants: [], firstCommentText: '', hasNotReadNotes: false,
      media: [media], mediaAltText: [], providers: [{ network: 'facebook' }],
      publicationDate: { dateTime: when, timezone: METRICOOL_TZ },
      shortener: false, smartLinkData: { ids: [] }, text, facebookData: { type: 'POST' },
    };
    const res = await fetch(`${METRICOOL_API}/v2/scheduler/posts?${qs}`, { method: 'POST', headers, body: JSON.stringify(post), cache: 'no-store' });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, via: 'metricool', error: data.message || data.error || `HTTP ${res.status}` };
    return { ok: true, via: 'metricool', id: String(data.data?.id ?? data.id ?? '') };
  } catch (e: any) {
    return { ok: false, via: 'metricool', error: String(e?.message || e) };
  }
}
