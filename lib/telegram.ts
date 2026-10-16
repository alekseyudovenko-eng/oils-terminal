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
