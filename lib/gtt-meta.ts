// lib/gtt-meta.ts — справочники для данных GTT (можно импортировать в браузер).

export const GTT_HS: { code: string; label: string }[] = [
  { code: '1511', label: 'Пальмовое масло' },
  { code: '1512', label: 'Подсолнечное и сафлоровое' },
  { code: '1513', label: 'Пальмоядровое и кокосовое' },
  { code: '1516', label: 'Гидрогенизированные жиры' },
  { code: '1517', label: 'Маргарин и спреды' },
];

/** Страны-импортёры (Geonom alpha-2). */
export const GTT_REPORTERS: { code: string; name: string; iso3: string }[] = [
  { code: 'RU', name: 'Россия', iso3: 'RUS' },
  { code: 'UZ', name: 'Узбекистан', iso3: 'UZB' },
  { code: 'AZ', name: 'Азербайджан', iso3: 'AZE' },
  { code: 'KZ', name: 'Казахстан', iso3: 'KAZ' },
  { code: 'KG', name: 'Киргизия', iso3: 'KGZ' },
  { code: 'TJ', name: 'Таджикистан', iso3: 'TJK' },
  { code: 'TM', name: 'Туркменистан', iso3: 'TKM' },
  { code: 'GE', name: 'Грузия', iso3: 'GEO' },
  { code: 'AM', name: 'Армения', iso3: 'ARM' },
  { code: 'BY', name: 'Беларусь', iso3: 'BLR' },
  { code: 'UA', name: 'Украина', iso3: 'UKR' },
  // Остальные страны таблицы MPOB из ежемесячного отчёта (Europe & Central Asia)
  { code: 'MD', name: 'Молдова', iso3: 'MDA' },
  { code: 'PL', name: 'Польша', iso3: 'POL' },
  { code: 'CZ', name: 'Чехия', iso3: 'CZE' },
  { code: 'SK', name: 'Словакия', iso3: 'SVK' },
  { code: 'HU', name: 'Венгрия', iso3: 'HUN' },
  { code: 'RO', name: 'Румыния', iso3: 'ROU' },
  { code: 'BG', name: 'Болгария', iso3: 'BGR' },
  { code: 'EE', name: 'Эстония', iso3: 'EST' },
  { code: 'LV', name: 'Латвия', iso3: 'LVA' },
  { code: 'LT', name: 'Литва', iso3: 'LTU' },
  { code: 'HR', name: 'Хорватия', iso3: 'HRV' },
  { code: 'XS', name: 'Сербия', iso3: 'SRB' }  // в GTT (Geonom) Сербия — XS,
];

export type TradeRow = {
  reporter: string; partner: string; partner_name: string | null; hs: string;
  year: number; month: number; value_usd: number | null; qty_t: number | null;
};
