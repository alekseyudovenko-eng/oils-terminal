// lib/channel.ts — общее для публикаций в Telegram-канал (@oilpalm): адрес канала и проверка HTML-разметки поста.

/** Канал для ежедневного снимка и авторских рубрик. */
export const channelChat = () => (process.env.TELEGRAM_SNAPSHOT_CHAT_ID || '@oilpalm').trim();

// Теги, которые понимает Telegram в parse_mode HTML. Всё остальное (<p>, <br>, <h1>…) Telegram отклоняет.
const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre', 'blockquote', 'tg-spoiler', 'span']);

/** Длина текста так, как её считает Telegram (без тегов, сущности как один символ). */
export function visibleLength(html: string): number {
  return html.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#\d+);/g, '_').length;
}

/** Ошибка разметки или null, если всё в порядке. */
export function checkTelegramHtml(html: string): string | null {
  for (const m of html.matchAll(/<\/?([a-zA-Z][\w-]*)[^>]*>/g)) {
    const tag = m[1].toLowerCase();
    if (!ALLOWED.has(tag)) return `tag <${tag}> is not supported by Telegram (use \\n for line breaks; allowed: ${[...ALLOWED].join(', ')})`;
  }
  return null;
}
