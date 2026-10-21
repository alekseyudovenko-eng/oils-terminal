// lib/telegram.ts — отправка сообщений в Telegram (parse_mode: HTML)

/** Экранирует текст для HTML-разметки Telegram: без этого символы & < > ломают сообщение. */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type TelegramResult = { ok: boolean; error?: string };

async function callTelegram(method: string, payload: Record<string, unknown>): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Telegram: не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    return { ok: false, error: 'Missing Telegram credentials' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', ...payload }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const error = data.description || `HTTP ${res.status}`;
      console.error(`Telegram ${method} error:`, error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e: any) {
    console.error(`Telegram ${method} fetch error:`, e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const r = await callTelegram('sendMessage', { text, disable_web_page_preview: true });
  return r.ok;
}

/** Фото с подписью. Подпись в Telegram ограничена 1024 символами. */
export async function sendTelegramPhoto(photoUrl: string, caption: string): Promise<boolean> {
  const r = await callTelegram('sendPhoto', { photo: photoUrl, caption: caption.slice(0, 1024) });
  return r.ok;
}

/**
 * Картинка-файл (PNG) с подписью в указанный чат или канал (например '@oilpalm').
 * Бот должен быть администратором канала с правом публиковать сообщения.
 */
export async function sendTelegramPhotoFile(png: ArrayBuffer, filename: string, caption: string, chatId: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' };
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption.slice(0, 1024));
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([png], { type: 'image/png' }), filename);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const error = data.description || `HTTP ${res.status}`;
      console.error('Telegram sendPhoto (file) error:', error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
