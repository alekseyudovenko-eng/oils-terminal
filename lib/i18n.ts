// lib/i18n.ts — языки сайта. Выбор хранится в cookie `lang` (по умолчанию русский).
// Файл без серверных зависимостей: его можно импортировать и из клиентских компонентов.

export const LOCALES = ['ru', 'en', 'uz', 'kk', 'ms'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';
export const LANG_COOKIE = 'lang';

/** Название языка на самом языке — так его быстрее узнают в переключателе. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  uz: 'Oʻzbekcha',
  kk: 'Қазақша',
  ms: 'Bahasa Melayu',
};

/** Короткая подпись в шапке. */
export const LOCALE_SHORT: Record<Locale, string> = { ru: 'RU', en: 'EN', uz: 'UZ', kk: 'KK', ms: 'MS' };

/** Локаль для Intl (числа и даты). */
export const INTL: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-GB',
  uz: 'uz-Latn-UZ',
  kk: 'kk-KZ',
  ms: 'ms-MY',
};

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

// ── Адреса страниц по языкам ───────────────────────────────────────────────
// Русская версия живёт без префикса (/, /market), остальные — с префиксом (/en, /en/market).
// Так у каждой версии свой адрес: поисковики видят все языки, ссылкой можно поделиться.

/** Языки, у которых есть префикс в адресе. */
export const PATH_LOCALES = LOCALES.filter(l => l !== DEFAULT_LOCALE);

/** Заголовок запроса, через который middleware передаёт язык из адреса страницы. */
export const LOCALE_HEADER = 'x-locale';

/** Публичные страницы, у которых есть языковые версии. */
export const PUBLIC_PATHS = ['/', '/market'] as const;

/** Адрес страницы на нужном языке: localePath('en', '/market#news') → '/en/market#news'. */
export function localePath(lang: Locale, path: string): string {
  if (lang === DEFAULT_LOCALE) return path;
  return path === '/' || path.startsWith('/#') ? `/${lang}${path.slice(1)}` : `/${lang}${path}`;
}

/** Убирает языковой префикс: '/en/market' → { lang: 'en', path: '/market' }. */
export function splitLocalePath(pathname: string): { lang: Locale | null; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)(.*)$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) return { lang: m[1], path: m[2] || '/' };
  return { lang: null, path: pathname || '/' };
}
