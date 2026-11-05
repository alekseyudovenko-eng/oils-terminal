// lib/vk.ts — публикация в сообщество ВКонтакте (https://vk.ru/public156172373) через VK API.
// Нужны переменные окружения в Vercel:
//   VK_GROUP_TOKEN — ключ доступа сообщества (Управление → Работа с API → Ключи доступа; права «стена» и «фотографии»);
//   VK_GROUP_ID    — номер сообщества без минуса (по умолчанию 156172373).
// Если ключа нет, публикация в VK просто пропускается.

const API = 'https://api.vk.com/method';
const V = '5.199';

export const vkConfigured = () => !!process.env.VK_GROUP_TOKEN;
const groupId = () => (process.env.VK_GROUP_ID || '156172373').replace(/^-/, '').trim();

export type VkResult = { ok: boolean; url?: string; error?: string; photo?: boolean };

async function call(method: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: process.env.VK_GROUP_TOKEN || '', v: V });
  const res = await fetch(`${API}/${method}`, { method: 'POST', body, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (data?.error) throw new Error(`${method}: ${data.error.error_msg || 'error'} (${data.error.error_code})`);
  return data.response;
}

/** Telegram-HTML → обычный текст для VK: ссылки становятся «текст (url)», теги убираются. */
export function htmlToVkText(html: string): string {
  return html
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, url, text) => (text.trim() === url ? url : `${text} (${url})`))
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .trim();
}

async function uploadWallPhoto(png: ArrayBuffer, filename: string): Promise<string> {
  const gid = groupId();
  const server = await call('photos.getWallUploadServer', { group_id: gid });
  const form = new FormData();
  form.append('photo', new Blob([png], { type: 'image/png' }), filename);
  const up = await fetch(server.upload_url, { method: 'POST', body: form, cache: 'no-store' }).then(r => r.json());
  if (!up?.photo || up.photo === '[]') throw new Error('photo upload: empty response');
  const saved = await call('photos.saveWallPhoto', { group_id: gid, server: String(up.server), photo: up.photo, hash: up.hash });
  const p = saved?.[0];
  if (!p) throw new Error('photos.saveWallPhoto: empty response');
  return `photo${p.owner_id}_${p.id}`;
}

/**
 * Пост на стене сообщества от имени сообщества. Картинка (PNG) — по желанию; если загрузить её не удалось,
 * пост уходит без неё, со ссылкой fallbackLink (VK покажет превью ссылки).
 */
export async function postToVk(message: string, opts: { png?: ArrayBuffer; filename?: string; fallbackLink?: string } = {}): Promise<VkResult> {
  if (!vkConfigured()) return { ok: false, error: 'VK not configured' };
  const gid = groupId();
  let attachment = '';
  let photo = false;
  let photoError = '';
  if (opts.png) {
    try { attachment = await uploadWallPhoto(opts.png, opts.filename || 'image.png'); photo = true; }
    catch (e: any) { photoError = String(e?.message || e); console.error('vk photo:', photoError); }
  }
  if (!attachment && opts.fallbackLink) attachment = opts.fallbackLink;
  try {
    const r = await call('wall.post', {
      owner_id: `-${gid}`, from_group: '1', message: message.slice(0, 15000), ...(attachment ? { attachments: attachment } : {}),
    });
    return { ok: true, url: `https://vk.ru/wall-${gid}_${r.post_id}`, photo, ...(photoError ? { error: `photo skipped: ${photoError}` } : {}) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e), photo };
  }
}

/** Проверка ключа без публикации: доступ к сообществу и к загрузке фото на стену. */
export async function checkVk(): Promise<Record<string, unknown>> {
  if (!vkConfigured()) return { ok: false, error: 'VK not configured' };
  const gid = groupId();
  const out: Record<string, unknown> = { groupId: gid };
  try {
    const g = await call('groups.getById', { group_id: gid });
    const grp = g?.groups?.[0] ?? g?.[0];
    out.group = grp?.name; out.screenName = grp?.screen_name;
  } catch (e: any) { out.groupError = String(e?.message || e); }
  try { const s = await call('photos.getWallUploadServer', { group_id: gid }); out.photoUpload = !!s?.upload_url; }
  catch (e: any) { out.photoUpload = false; out.photoError = String(e?.message || e); }
  out.ok = !out.groupError;
  return out;
}
