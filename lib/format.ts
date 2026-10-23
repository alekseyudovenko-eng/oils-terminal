// lib/format.ts — единое форматирование чисел и дат.
// Последний необязательный параметр — язык сайта; без него форматируем по-русски.
import { INTL, type Locale } from './i18n';

const nf = (min: number, max: number, lang: Locale = 'ru') =>
  new Intl.NumberFormat(INTL[lang], { minimumFractionDigits: min, maximumFractionDigits: max });

/** Цена: до 2 знаков для мелких значений, целые для крупных. */
export function fmtPrice(v: number | null | undefined, lang: Locale = 'ru'): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return nf(0, 0, lang).format(v);
  if (abs >= 100) return nf(1, 2, lang).format(v);
  if (abs >= 10) return nf(2, 2, lang).format(v);
  return nf(2, 4, lang).format(v);
}

export function fmtInt(v: number | null | undefined, lang: Locale = 'ru'): string {
  return v == null ? '—' : nf(0, 0, lang).format(Math.round(v));
}

/** Со знаком: +12 / −8 (настоящий минус, а не дефис). */
export function fmtSigned(v: number | null | undefined, digits = 0, lang: Locale = 'ru'): string {
  if (v == null) return '—';
  const s = nf(digits, digits, lang).format(Math.abs(v));
  if (Math.abs(v) < 0.5 * 10 ** -digits) return s;
  return `${v > 0 ? '+' : '−'}${s}`;
}

export function fmtPct(v: number | null | undefined, lang: Locale = 'ru'): string {
  return v == null ? '—' : `${fmtSigned(v, 1, lang)}%`;
}

export function trend(v: number | null | undefined): 'up' | 'down' | 'flat' {
  if (v == null || Math.abs(v) < 0.05) return 'flat';
  return v > 0 ? 'up' : 'down';
}

export function fmtDate(iso: string, lang: Locale = 'ru'): string {
  return new Date(iso).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Полная дата: «23 октября 2026 г.» / «23 October 2026». */
export function fmtLongDate(iso: string, lang: Locale = 'ru'): string {
  return new Date(iso).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function fmtTimeUtc(iso: string, lang: Locale = 'ru'): string {
  return new Date(iso).toLocaleString(INTL[lang], {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

const AGO: Record<Locale, { min: string; h: string; yesterday: string }> = {
  ru: { min: 'мин назад', h: 'ч назад', yesterday: 'вчера' },
  en: { min: 'min ago', h: 'h ago', yesterday: 'yesterday' },
  uz: { min: 'daqiqa oldin', h: 'soat oldin', yesterday: 'kecha' },
  kk: { min: 'мин бұрын', h: 'сағ бұрын', yesterday: 'кеше' },
  ms: { min: 'min lalu', h: 'jam lalu', yesterday: 'semalam' },
};

/** «3 ч назад», «вчера», «12 окт.» */
export function fmtAgo(iso: string, lang: Locale = 'ru', now = Date.now()): string {
  const a = AGO[lang];
  const diff = (now - new Date(iso).getTime()) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))} ${a.min}`;
  if (diff < 24 * 60) return `${Math.round(diff / 60)} ${a.h}`;
  if (diff < 48 * 60) return a.yesterday;
  return fmtDate(iso, lang);
}
