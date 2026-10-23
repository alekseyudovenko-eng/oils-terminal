// Заголовок, краткое изложение и регион новости на языке сайта.
// Нет перевода на нужный язык — берём английский, затем русский оригинал.
import type { Locale } from './i18n';
import type { NewsItem } from './news';

const SUFFIX: Record<Exclude<Locale, 'ru'>, 'En' | 'Uz' | 'Kk' | 'Ms'> = { en: 'En', uz: 'Uz', kk: 'Kk', ms: 'Ms' };

export function newsText(n: NewsItem, lang: Locale): { title: string; summary: string; translated: boolean } {
  if (lang === 'ru') return { title: n.title, summary: n.summary, translated: true };
  const pick = (suf: string) => ({
    title: (n as Record<string, any>)[`title${suf}`] as string | undefined,
    summary: (n as Record<string, any>)[`summary${suf}`] as string | undefined,
  });
  const own = pick(SUFFIX[lang]);
  const en = pick('En');
  const title = own.title || en.title || (n.lang === 'en' ? n.originalTitle : undefined);
  const summary = own.summary || en.summary;
  return {
    title: title || n.title,
    summary: summary || (title ? '' : n.summary),
    translated: !!(own.title && own.summary),
  };
}

// Регионы в news.json записаны по-русски; переводим известные, остальное оставляем как есть.
const REGIONS: Record<string, Record<Exclude<Locale, 'ru'>, string>> = {
  'ЕС': { en: 'EU', uz: 'YeI', kk: 'ЕО', ms: 'EU' },
  'Индия': { en: 'India', uz: 'Hindiston', kk: 'Үндістан', ms: 'India' },
  'Индонезия': { en: 'Indonesia', uz: 'Indoneziya', kk: 'Индонезия', ms: 'Indonesia' },
  'Казахстан': { en: 'Kazakhstan', uz: 'Qozogʻiston', kk: 'Қазақстан', ms: 'Kazakhstan' },
  'Китай': { en: 'China', uz: 'Xitoy', kk: 'Қытай', ms: 'China' },
  'Малайзия': { en: 'Malaysia', uz: 'Malayziya', kk: 'Малайзия', ms: 'Malaysia' },
  'Россия': { en: 'Russia', uz: 'Rossiya', kk: 'Ресей', ms: 'Rusia' },
  'США': { en: 'USA', uz: 'AQSH', kk: 'АҚШ', ms: 'AS' },
  'Сингапур': { en: 'Singapore', uz: 'Singapur', kk: 'Сингапур', ms: 'Singapura' },
  'Узбекистан': { en: 'Uzbekistan', uz: 'Oʻzbekiston', kk: 'Өзбекстан', ms: 'Uzbekistan' },
  'Украина': { en: 'Ukraine', uz: 'Ukraina', kk: 'Украина', ms: 'Ukraine' },
  'Кыргызстан': { en: 'Kyrgyzstan', uz: 'Qirgʻiziston', kk: 'Қырғызстан', ms: 'Kyrgyzstan' },
  'Киргизия': { en: 'Kyrgyzstan', uz: 'Qirgʻiziston', kk: 'Қырғызстан', ms: 'Kyrgyzstan' },
  'Таджикистан': { en: 'Tajikistan', uz: 'Tojikiston', kk: 'Тәжікстан', ms: 'Tajikistan' },
  'Туркменистан': { en: 'Turkmenistan', uz: 'Turkmaniston', kk: 'Түрікменстан', ms: 'Turkmenistan' },
  'Азербайджан': { en: 'Azerbaijan', uz: 'Ozarbayjon', kk: 'Әзербайжан', ms: 'Azerbaijan' },
  'Грузия': { en: 'Georgia', uz: 'Gruziya', kk: 'Грузия', ms: 'Georgia' },
  'Армения': { en: 'Armenia', uz: 'Armaniston', kk: 'Армения', ms: 'Armenia' },
  'Беларусь': { en: 'Belarus', uz: 'Belarus', kk: 'Беларусь', ms: 'Belarus' },
  'Молдова': { en: 'Moldova', uz: 'Moldova', kk: 'Молдова', ms: 'Moldova' },
  'Турция': { en: 'Turkey', uz: 'Turkiya', kk: 'Түркия', ms: 'Turkiye' },
  'Пакистан': { en: 'Pakistan', uz: 'Pokiston', kk: 'Пәкістан', ms: 'Pakistan' },
  'Бангладеш': { en: 'Bangladesh', uz: 'Bangladesh', kk: 'Бангладеш', ms: 'Bangladesh' },
  'Бразилия': { en: 'Brazil', uz: 'Braziliya', kk: 'Бразилия', ms: 'Brazil' },
  'Аргентина': { en: 'Argentina', uz: 'Argentina', kk: 'Аргентина', ms: 'Argentina' },
  'Польша': { en: 'Poland', uz: 'Polsha', kk: 'Польша', ms: 'Poland' },
  'Болгария': { en: 'Bulgaria', uz: 'Bolgariya', kk: 'Болгария', ms: 'Bulgaria' },
  'Словакия': { en: 'Slovakia', uz: 'Slovakiya', kk: 'Словакия', ms: 'Slovakia' },
  'Румыния': { en: 'Romania', uz: 'Ruminiya', kk: 'Румыния', ms: 'Romania' },
  'Венгрия': { en: 'Hungary', uz: 'Vengriya', kk: 'Венгрия', ms: 'Hungary' },
  'Чехия': { en: 'Czech Republic', uz: 'Chexiya', kk: 'Чехия', ms: 'Republik Czech' },
  'Черноморский регион': { en: 'Black Sea', uz: 'Qora dengiz mintaqasi', kk: 'Қара теңіз өңірі', ms: 'Rantau Laut Hitam' },
  'Центральная Азия': { en: 'Central Asia', uz: 'Markaziy Osiyo', kk: 'Орталық Азия', ms: 'Asia Tengah' },
  'Кавказ': { en: 'Caucasus', uz: 'Kavkaz', kk: 'Кавказ', ms: 'Kaukasus' },
};

export function regionText(region: string | undefined, lang: Locale): string | undefined {
  if (!region || lang === 'ru') return region;
  return region.split(/,\s*/).map(r => REGIONS[r]?.[lang] ?? r).join(', ');
}
