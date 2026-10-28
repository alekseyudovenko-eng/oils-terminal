// lib/country-format.ts — форматирование чисел и дат для страниц стран.
import { INTL, type Locale } from './i18n';
import type { CountriesDict } from './dict-countries';

export const nf = (v: number, lang: Locale, digits = 1) => v.toLocaleString(INTL[lang], { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const pct = (v: number | null | undefined, lang: Locale, digits = 1) => (v == null || !isFinite(v) ? '—' : `${nf(v, lang, digits)}%`);
export const signed = (v: number | null | undefined, lang: Locale, digits = 1) =>
  v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf(Math.abs(v), lang, digits)}%`;
export const usdBn = (v: number | null | undefined, lang: Locale, D: CountriesDict) => (v == null ? '—' : `${nf(v / 1e9, lang, v >= 1e11 ? 0 : 1)} ${D.units.bln}`);
export const usd = (v: number | null | undefined, lang: Locale) => (v == null ? '—' : `$${nf(v, lang, 0)}`);
export const people = (v: number | null | undefined, lang: Locale, D: CountriesDict) => (v == null ? '—' : `${nf(v / 1e6, lang, 1)} ${D.units.mln}`);
export const tonnes = (v: number | null | undefined, lang: Locale) => (v == null ? '—' : nf(Math.round(v), lang, 0));
export const longDate = (iso: string, lang: Locale) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const ymLabel = (ym: string, lang: Locale) =>
  new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1)).toLocaleDateString(INTL[lang], { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const share = (part: number, total: number, lang: Locale) => (total > 0 ? pct((100 * part) / total, lang, 0) : '—');
export const yoy = (cur: number, prev: number | null, lang: Locale) => (prev && prev > 0 ? signed((100 * cur) / prev - 100, lang, 0) : '—');
