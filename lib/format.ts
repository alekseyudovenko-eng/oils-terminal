// lib/format.ts — единое форматирование чисел и дат.

const nf = (min: number, max: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: min, maximumFractionDigits: max });

/** Цена: до 2 знаков для мелких значений, целые для крупных. */
export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return nf(0, 0).format(v);
  if (abs >= 100) return nf(1, 2).format(v);
  if (abs >= 10) return nf(2, 2).format(v);
  return nf(2, 4).format(v);
}

export function fmtInt(v: number | null | undefined): string {
  return v == null ? '—' : nf(0, 0).format(Math.round(v));
}

/** Со знаком: +12 / −8 (настоящий минус, а не дефис). */
export function fmtSigned(v: number | null | undefined, digits = 0): string {
  if (v == null) return '—';
  const s = nf(digits, digits).format(Math.abs(v));
  if (Math.abs(v) < 0.5 * 10 ** -digits) return s;
  return `${v > 0 ? '+' : '−'}${s}`;
}

export function fmtPct(v: number | null | undefined): string {
  return v == null ? '—' : `${fmtSigned(v, 1)}%`;
}

export function trend(v: number | null | undefined): 'up' | 'down' | 'flat' {
  if (v == null || Math.abs(v) < 0.05) return 'flat';
  return v > 0 ? 'up' : 'down';
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function fmtTimeUtc(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

/** «3 ч назад», «вчера», «12 окт.» */
export function fmtAgo(iso: string, now = Date.now()): string {
  const diff = (now - new Date(iso).getTime()) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))} мин назад`;
  if (diff < 24 * 60) return `${Math.round(diff / 60)} ч назад`;
  if (diff < 48 * 60) return 'вчера';
  return fmtDate(iso);
}
