// lib/lab-i18n.ts — общие помощники перевода для страниц лаборатории.
import { INTL, type Locale } from './i18n';
import { LAB_DICT } from './dict-lab';
import { getLocale } from './i18n-server';

export function getLabDict() {
  const lang = getLocale();
  return { lang, L: LAB_DICT[lang] };
}

/** Накладывает перевод на исходник: объекты — по ключам, массивы — по индексу, пустые значения пропускаются. */
export function overlay<T>(base: T, over: unknown): T {
  if (over == null || over === '') return base;
  if (Array.isArray(base)) {
    const o = Array.isArray(over) ? over : [];
    return base.map((b, i) => overlay(b, o[i])) as T;
  }
  if (base && typeof base === 'object') {
    if (typeof over !== 'object') return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of Object.keys(out)) out[k] = overlay(out[k], (over as Record<string, unknown>)[k]);
    return out as T;
  }
  return (typeof over === typeof base ? over : base) as T;
}

const RU_MONTHS: Record<string, number> = {
  янв: 1, фев: 2, мар: 3, апр: 4, май: 5, мая: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
};

/** «ноя 26» / «август 1997» → { y, m } */
export function parseRuMonth(s: string): { y: number; m: number } | null {
  const m = s.trim().toLowerCase().match(/^([а-я]+)\.?\s+(\d{2,4})$/);
  if (!m) return null;
  const mon = RU_MONTHS[m[1].slice(0, 3)];
  if (!mon) return null;
  const y = Number(m[2]);
  return { y: y < 100 ? 2000 + y : y, m: mon };
}

/** Подпись месяца на языке страницы; short — «Nov 26», иначе «August 1997». */
export function monthLabel(s: string, lang: Locale, short = true): string {
  if (lang === 'ru') return s;
  const p = parseRuMonth(s);
  if (!p) return s;
  const d = new Date(Date.UTC(p.y, p.m - 1, 1));
  if (short) {
    const mon = d.toLocaleDateString(INTL[lang], { month: 'short', timeZone: 'UTC' }).replace('.', '');
    return `${mon} ${String(p.y).slice(2)}`;
  }
  return d.toLocaleDateString(INTL[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Месяц из ISO-ключа «2025-03» на языке страницы. */
export function isoMonthLabel(ym: string, lang: Locale, style: 'short' | 'long' = 'short'): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString(INTL[lang], { month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC' });
}

export function num(v: number, lang: Locale, digits = 1): string {
  return v.toLocaleString(INTL[lang], { maximumFractionDigits: digits });
}
