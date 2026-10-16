// lib/psd-meta.ts — справочники для балансов USDA (без серверного кода, можно импортировать в браузер).

export type OilId = 'palm' | 'soy' | 'sunflower' | 'rapeseed';
export type Metric = 'production' | 'consumption' | 'imports' | 'exports' | 'ending_stocks';

export const OILS: { id: OilId; label: string; match: RegExp; fallbackCode: string }[] = [
  { id: 'palm', label: 'Пальмовое', match: /palm/i, fallbackCode: '4243000' },
  { id: 'soy', label: 'Соевое', match: /soybean/i, fallbackCode: '4232000' },
  { id: 'sunflower', label: 'Подсолнечное', match: /sunflower/i, fallbackCode: '4236000' },
  { id: 'rapeseed', label: 'Рапсовое', match: /rapeseed/i, fallbackCode: '4239100' },
];

export const METRICS: { id: Metric; label: string; match: RegExp; fallbackId: number }[] = [
  { id: 'production', label: 'Производство', match: /^production$/i, fallbackId: 28 },
  { id: 'consumption', label: 'Потребление', match: /^domestic consumption$/i, fallbackId: 125 },
  { id: 'imports', label: 'Импорт', match: /^imports$/i, fallbackId: 57 },
  { id: 'exports', label: 'Экспорт', match: /^exports$/i, fallbackId: 88 },
  { id: 'ending_stocks', label: 'Конечные запасы', match: /^ending stocks$/i, fallbackId: 176 },
];

export const WORLD = 'WORLD';

export type PsdRow = {
  commodity: OilId;
  country_code: string;
  country_name: string;
  market_year: number;
  attribute: Metric;
  value: number; // тыс. т
};

/** «2025/26» для маркетингового года 2025. */
export const myLabel = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
