// lib/regulation.ts — регуляторная база (data/regulation.json): типы и выборки для страницы /lab/regulation.
import raw from '@/data/regulation.json';
import type { Locale } from './i18n';

export type Bloc = 'EU' | 'EAEU' | 'other';
export type ClaimUse = 'high' | 'medium' | 'low' | 'none' | 'nodata';
export type Status = 'in_force' | 'upcoming' | 'proposal';
export type MeasureType = 'disclosure' | 'claims' | 'ban' | 'dairy' | 'import' | 'traceability' | 'tax' | 'standard' | 'sustainability';
type L2 = { ru: string; en: string };

export type Country = {
  code: string; bloc: Bloc; name: Record<Locale, string>;
  claimPhrase: string; claimUse: ClaimUse; practice: L2; summary: L2;
};
export type Measure = {
  id: string; scope: string; type: MeasureType; status: Status; date: string;
  act: L2; title: L2; text: L2; url: string;
};

export const REG = raw as unknown as { updatedAt: string; period: L2; countries: Country[]; measures: Measure[] };

/** Тексты норм есть по-русски и по-английски; остальные языки получают английский. */
export const contentLang = (lang: Locale): 'ru' | 'en' => (lang === 'ru' ? 'ru' : 'en');

/** Нормы, которые относятся к стране: её собственные и общие нормы её блока. */
export const measuresFor = (c: Country) => REG.measures.filter(m => m.scope === c.code || m.scope === c.bloc);
