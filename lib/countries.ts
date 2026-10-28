// lib/countries.ts — список стран зоны ответственности IMA и сводки по ним (data/countries.json).
import raw from '@/data/countries.json';

type L2 = { ru: string; en: string };
export type Source = { title: string; url: string; date: string };
export type Rating = { rating: string; outlook: string; date: string } | null;

export type CountryProfile = {
  code: string; flag: string; capital: L2; languages: L2;
  currency: { code: string } & L2;
  memberships: string[];
  political: { system: L2; headOfState: L2; headOfGov: L2; elections: L2; notes: L2; sources: Source[] };
  financial: {
    centralBank: L2;
    policyRate: { value: number | null; decided: string } & L2;
    ratings: { sp: Rating; moodys: Rating; fitch: Rating; note?: L2 };
    fxRegime: L2; sources: Source[];
  };
};

export const PROFILES = raw as unknown as { updatedAt: string; countries: CountryProfile[] };

/** 23 страны: 20 из приложения 1 к договору IMA–MPOC + Азербайджан, Грузия, Сербия. */
export const MONITORED: { code: string; iso3: string; gtt: string; fx?: string; ru: string; en: string }[] = [
  { code: 'RU', iso3: 'RUS', gtt: 'RU', fx: 'FX_IDC:USDRUB', ru: 'Россия', en: 'Russia' },
  { code: 'UZ', iso3: 'UZB', gtt: 'UZ', fx: 'FX_IDC:USDUZS', ru: 'Узбекистан', en: 'Uzbekistan' },
  { code: 'AZ', iso3: 'AZE', gtt: 'AZ', fx: 'FX_IDC:USDAZN', ru: 'Азербайджан', en: 'Azerbaijan' },
  { code: 'KZ', iso3: 'KAZ', gtt: 'KZ', fx: 'FX_IDC:USDKZT', ru: 'Казахстан', en: 'Kazakhstan' },
  { code: 'KG', iso3: 'KGZ', gtt: 'KG', ru: 'Киргизия', en: 'Kyrgyzstan' },
  { code: 'TJ', iso3: 'TJK', gtt: 'TJ', fx: 'FX_IDC:USDTJS', ru: 'Таджикистан', en: 'Tajikistan' },
  { code: 'TM', iso3: 'TKM', gtt: 'TM', fx: 'FX_IDC:USDTMT', ru: 'Туркменистан', en: 'Turkmenistan' },
  { code: 'AM', iso3: 'ARM', gtt: 'AM', fx: 'FX_IDC:USDAMD', ru: 'Армения', en: 'Armenia' },
  { code: 'GE', iso3: 'GEO', gtt: 'GE', fx: 'FX_IDC:USDGEL', ru: 'Грузия', en: 'Georgia' },
  { code: 'UA', iso3: 'UKR', gtt: 'UA', fx: 'FX_IDC:USDUAH', ru: 'Украина', en: 'Ukraine' },
  { code: 'BY', iso3: 'BLR', gtt: 'BY', fx: 'FX_IDC:USDBYN', ru: 'Беларусь', en: 'Belarus' },
  { code: 'MD', iso3: 'MDA', gtt: 'MD', fx: 'FX_IDC:USDMDL', ru: 'Молдова', en: 'Moldova' },
  { code: 'PL', iso3: 'POL', gtt: 'PL', fx: 'FX_IDC:USDPLN', ru: 'Польша', en: 'Poland' },
  { code: 'CZ', iso3: 'CZE', gtt: 'CZ', fx: 'FX_IDC:USDCZK', ru: 'Чехия', en: 'Czech Republic' },
  { code: 'SK', iso3: 'SVK', gtt: 'SK', fx: 'FX_IDC:USDEUR', ru: 'Словакия', en: 'Slovakia' },
  { code: 'HU', iso3: 'HUN', gtt: 'HU', fx: 'FX_IDC:USDHUF', ru: 'Венгрия', en: 'Hungary' },
  { code: 'RO', iso3: 'ROU', gtt: 'RO', fx: 'FX_IDC:USDRON', ru: 'Румыния', en: 'Romania' },
  { code: 'BG', iso3: 'BGR', gtt: 'BG', fx: 'FX_IDC:USDEUR', ru: 'Болгария', en: 'Bulgaria' },
  { code: 'HR', iso3: 'HRV', gtt: 'HR', fx: 'FX_IDC:USDEUR', ru: 'Хорватия', en: 'Croatia' },
  { code: 'RS', iso3: 'SRB', gtt: 'XS', fx: 'FX_IDC:USDRSD', ru: 'Сербия', en: 'Serbia' },
  { code: 'EE', iso3: 'EST', gtt: 'EE', fx: 'FX_IDC:USDEUR', ru: 'Эстония', en: 'Estonia' },
  { code: 'LV', iso3: 'LVA', gtt: 'LV', fx: 'FX_IDC:USDEUR', ru: 'Латвия', en: 'Latvia' },
  { code: 'LT', iso3: 'LTU', gtt: 'LT', fx: 'FX_IDC:USDEUR', ru: 'Литва', en: 'Lithuania' },
];

export const profileOf = (code: string) => PROFILES.countries.find(c => c.code === code);
/** Страницы есть у стран со сводкой (пилот: RU, UZ, AZ). */
export const ACTIVE = MONITORED.filter(c => profileOf(c.code));
