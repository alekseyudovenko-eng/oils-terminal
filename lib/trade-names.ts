// lib/trade-names.ts — названия стран-партнёров на языке страницы (по коду ISO; в GTT Сербия — XS).
import { INTL, type Locale } from './i18n';

export function partnerNamer(lang: Locale, unspecified: string, otherEurope: string) {
  const dn = new Intl.DisplayNames([INTL[lang]], { type: 'region' });
  const SPECIAL: Record<string, string> = { QU: unspecified, QV: unspecified, QW: unspecified, Q1: otherEurope };
  return (code: string, fallback?: string | null) => {
    if (SPECIAL[code]) return SPECIAL[code];
    const iso = code === 'XS' ? 'RS' : code;
    if (/^[A-Z]{2}$/.test(iso) && iso !== 'AN') {
      try { const n = dn.of(iso); if (n && n !== iso) return n; } catch { /* нет в справочнике */ }
    }
    return fallback || code;
  };
}
