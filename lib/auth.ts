// lib/auth.ts — единая проверка ключей для служебных маршрутов.
// Если секрет не задан в переменных окружения, доступ ЗАКРЫТ (а не открыт).

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function matchesSecret(request: Request, secretName: string, allowQueryKey: boolean): boolean {
  const expected = (process.env[secretName] || '').trim();
  if (!expected) return false;
  if (bearerToken(request) === expected) return true;
  if (allowQueryKey) {
    const key = new URL(request.url).searchParams.get('key') || '';
    if (key === expected) return true;
  }
  return false;
}

/**
 * Cron-маршруты. Vercel Cron сам присылает заголовок
 * `Authorization: Bearer <CRON_SECRET>`, если переменная CRON_SECRET задана.
 * Для ручного запуска (GitHub Actions, браузер) можно передать ?key=<CRON_SECRET>.
 */
export function isCronAuthorized(request: Request): boolean {
  return matchesSecret(request, 'CRON_SECRET', true);
}

/** Маршруты записи данных (POST). Только заголовок Authorization: Bearer <INTERNAL_API_KEY>. */
export function isInternalAuthorized(request: Request): boolean {
  return matchesSecret(request, 'INTERNAL_API_KEY', false);
}
