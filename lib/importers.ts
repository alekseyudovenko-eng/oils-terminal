// lib/importers.ts — база ключевых импортёров и покупателей растительных масел по странам.
// Данные лежат в data/importers.json и показываются только в закрытой «Лаборатории IMA».

import raw from '@/data/importers.json';

export type Company = {
  name: string;               // как зарегистрирована / как известна на рынке
  group?: string;             // холдинг, к которому относится
  city?: string;
  segment: string[];          // переработка, маргарин и спреды, кондитерка, трейдер, дистрибуция, HoReCa…
  products: string[];         // пальмовое, подсолнечное, соевое, рапсовое, жиры спецназначения…
  volume?: string;            // объём закупок/импорта, как в источнике («≈120 тыс. т/год, 2025»)
  website?: string;
  contacts?: string;          // общий телефон/почта компании, без личных данных
  notes?: string;
  sources?: string[];         // ссылки, по которым проверены сведения
  checkedAt?: string;         // дата последней проверки, YYYY-MM-DD
};

export type MarketFact = { label: string; value: string; source?: string };

export type Country = {
  id: string;
  name: string;
  summary: string;            // 1–3 предложения о рынке
  market: MarketFact[];       // ключевые цифры: импорт, доля пальмы, пошлины…
  companies: Company[];
};

export type ImportersData = { updatedAt: string; countries: Country[] };

export const IMPORTERS = raw as ImportersData;
