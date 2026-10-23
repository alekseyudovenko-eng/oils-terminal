// lib/i18n-server.ts — язык текущего запроса (только для серверных компонентов).
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from './i18n';
import { DICT } from './dict';

export function getLocale(): Locale {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function getDict() {
  const lang = getLocale();
  return { lang, t: DICT[lang] };
}
