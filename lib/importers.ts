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
  scale?: string;             // крупнейший / крупный / средний / малый / не указан — для фильтра
  reliability?: string;       // высокая / средняя / низкая
};

export type MarketFact = { label: string; value: string; source?: string };

/** Тонны по годам: { '2024': 108000, … }; пропущенный год = нет данных. */
export type YearSeries = Record<string, number>;

export type Trade = {
  source: 'country' | 'mirror' | '';   // данные самой страны или зеркальные (по отчётам партнёров)
  hs: Record<string, YearSeries>;      // код ТН ВЭД (1511, 1513, 1516, 1517) → тонны по годам, ITC TradeMap
};

export type Country = {
  id: string;
  name: string;
  summary: string;            // 1–3 предложения о рынке
  market: MarketFact[];       // ключевые цифры: импорт, доля пальмы, пошлины…
  trade?: Trade;
  suppliers1511?: { name: string; t: YearSeries }[];   // зеркальные данные; «Весь мир» = итог
  companies: Company[];
};

export type ImportersData = { updatedAt: string; countries: Country[] };

export const IMPORTERS = raw as ImportersData;
