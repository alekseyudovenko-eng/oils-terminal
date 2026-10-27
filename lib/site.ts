// lib/site.ts — адрес сайта и метаданные для поисковиков (canonical, hreflang).
import type { Metadata } from 'next';
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from './i18n';

export const SITE_URL = (process.env.SITE_URL || 'https://imaoils.vercel.app').replace(/\/+$/, '');

/** Локаль для OpenGraph. */
export const OG_LOCALE: Record<Locale, string> = { ru: 'ru_RU', en: 'en_GB', uz: 'uz_UZ', kk: 'kk_KZ', ms: 'ms_MY' };

/** canonical текущей версии и ссылки hreflang на все языки (x-default — русская). */
export function pageAlternates(path: string, lang: Locale): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  languages['x-default'] = localePath(DEFAULT_LOCALE, path);
  return { canonical: localePath(lang, path), languages };
}
