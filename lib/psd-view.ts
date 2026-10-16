// lib/psd-view.ts — готовит компактные таблицы из балансов USDA для страницы «Рынок».
import { METRICS, OILS, WORLD, type Metric, type OilId, type PsdRow } from './psd-meta';

export type Ranked = { name: string; value: number; share: number | null };

export type OilView = {
  id: OilId;
  label: string;
  years: number[];                                   // по возрастанию
  world: Record<Metric, Record<number, number>>;     // мир: показатель → год → тыс. т
  top: Record<number, Partial<Record<Metric, Ranked[]>>>; // год → показатель → топ-10
  focus: Record<number, { name: string; values: Partial<Record<Metric, number>> }[]>;
};

const RU: Record<string, string> = {
  'European Union': 'ЕС', 'EU-27': 'ЕС', Indonesia: 'Индонезия', Malaysia: 'Малайзия', India: 'Индия',
  China: 'Китай', 'United States': 'США', Brazil: 'Бразилия', Argentina: 'Аргентина', Ukraine: 'Украина',
  Russia: 'Россия', Kazakhstan: 'Казахстан', Uzbekistan: 'Узбекистан', Kyrgyzstan: 'Киргизия',
  Tajikistan: 'Таджикистан', Turkmenistan: 'Туркменистан', Azerbaijan: 'Азербайджан', Georgia: 'Грузия',
  Armenia: 'Армения', Turkey: 'Турция', 'Turkiye': 'Турция', Pakistan: 'Пакистан', Bangladesh: 'Бангладеш',
  Thailand: 'Таиланд', Colombia: 'Колумбия', Nigeria: 'Нигерия', Canada: 'Канада', Australia: 'Австралия',
  'United Kingdom': 'Великобритания', Egypt: 'Египет', Iran: 'Иран', Iraq: 'Ирак', 'Saudi Arabia': 'Саудовская Аравия',
  Philippines: 'Филиппины', Vietnam: 'Вьетнам', Japan: 'Япония', 'Korea, South': 'Южная Корея', Mexico: 'Мексика',
  Paraguay: 'Парагвай', Bolivia: 'Боливия', 'Papua New Guinea': 'Папуа — Новая Гвинея', Guatemala: 'Гватемала',
  Honduras: 'Гондурас', Kenya: 'Кения', Tanzania: 'Танзания', Serbia: 'Сербия', Moldova: 'Молдавия',
  Belarus: 'Беларусь', 'South Africa': 'ЮАР', Algeria: 'Алжир', Morocco: 'Марокко', Israel: 'Израиль',
  'United Arab Emirates': 'ОАЭ', Singapore: 'Сингапур', Myanmar: 'Мьянма', 'Burma': 'Мьянма', 'Sri Lanka': 'Шри-Ланка',
};

const FOCUS = ['Kazakhstan', 'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Azerbaijan', 'Georgia',
  'Armenia', 'Russia', 'Ukraine', 'Turkey', 'Turkiye', 'European Union'];

export const ruCountry = (name: string) => RU[name] ?? name;

export function buildPsdView(rows: PsdRow[]): OilView[] {
  return OILS.map(oil => {
    const mine = rows.filter(r => r.commodity === oil.id);
    const worldRows = mine.filter(r => r.country_code === WORLD);
    const years = Array.from(new Set(worldRows.map(r => r.market_year))).sort((a, b) => a - b);

    const world = Object.fromEntries(METRICS.map(m => [m.id, {}])) as OilView['world'];
    for (const r of worldRows) world[r.attribute][r.market_year] = r.value;

    const top: OilView['top'] = {};
    const focus: OilView['focus'] = {};
    for (const y of years) {
      const countries = mine.filter(r => r.market_year === y && r.country_code !== WORLD);
      top[y] = {};
      for (const m of ['production', 'consumption', 'exports', 'imports'] as Metric[]) {
        const total = world[m][y];
        top[y][m] = countries
          .filter(r => r.attribute === m && r.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map(r => ({ name: ruCountry(r.country_name), value: r.value, share: total ? (r.value / total) * 100 : null }));
      }
      const byCountry = new Map<string, Partial<Record<Metric, number>>>();
      for (const r of countries.filter(c => FOCUS.includes(c.country_name))) {
        const v = byCountry.get(r.country_name) ?? {};
        v[r.attribute] = r.value;
        byCountry.set(r.country_name, v);
      }
      focus[y] = Array.from(byCountry.entries())
        .map(([name, values]) => ({ name: ruCountry(name), values }))
        .sort((a, b) => (b.values.consumption ?? 0) - (a.values.consumption ?? 0));
    }

    return { id: oil.id, label: oil.label, years, world, top, focus };
  });
}
