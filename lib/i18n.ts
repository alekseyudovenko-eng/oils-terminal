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
