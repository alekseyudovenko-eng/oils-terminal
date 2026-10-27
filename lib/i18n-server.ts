// lib/i18n-server.ts — язык текущего запроса (только для серверных компонентов).
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LANG_COOKIE, LOCALE_HEADER, isLocale, type Locale } from './i18n';
import { DICT } from './dict';

// Публичные страницы: язык из адреса (/en/market), его передаёт middleware.
// Лаборатория и прочее: язык из cookie, по умолчанию русский.
export function getLocale(): Locale {
  const fromPath = headers().get(LOCALE_HEADER);
  if (isLocale(fromPath)) return fromPath;
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function getDict() {
  const lang = getLocale();
  return { lang, t: DICT[lang] };
}
