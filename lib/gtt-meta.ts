// lib/gtt-meta.ts — справочники для данных GTT (можно импортировать в браузер).

export const GTT_HS: { code: string; label: string }[] = [
  { code: '1511', label: 'Пальмовое масло' },
  { code: '1512', label: 'Подсолнечное и сафлоровое' },
  { code: '1513', label: 'Пальмоядровое и кокосовое' },
  { code: '1516', label: 'Гидрогенизированные жиры' },
  { code: '1517', label: 'Маргарин и спреды' },
];

/** Страны-импортёры (Geonom alpha-2). */
export const GTT_REPORTERS: { code: string; name: string }[] = [
  { code: 'RU', name: 'Россия' },
  { code: 'UZ', name: 'Узбекистан' },
  { code: 'AZ', name: 'Азербайджан' },
  { code: 'KZ', name: 'Казахстан' },
  { code: 'KG', name: 'Киргизия' },
  { code: 'TJ', name: 'Таджикистан' },
  { code: 'TM', name: 'Туркменистан' },
  { code: 'GE', name: 'Грузия' },
  { code: 'AM', name: 'Армения' },
  { code: 'BY', name: 'Беларусь' },
  { code: 'UA', name: 'Украина' },
  // Остальные страны таблицы MPOB из ежемесячного отчёта (Europe & Central Asia)
  { code: 'PL', name: 'Польша' },
  { code: 'CZ', name: 'Чехия' },
  { code: 'HU', name: 'Венгрия' },
  { code: 'RO', name: 'Румыния' },
  { code: 'BG', name: 'Болгария' },
  { code: 'EE', name: 'Эстония' },
  { code: 'LV', name: 'Латвия' },
  { code: 'LT', name: 'Литва' },
  { code: 'HR', name: 'Хорватия' },
  { code: 'XS', name: 'Сербия' }  // в GTT (Geonom) Сербия — XS,
];

export type TradeRow = {
  reporter: string; partner: string; partner_name: string | null; hs: string;
  year: number; month: number; value_usd: number | null; qty_t: number | null;
};
