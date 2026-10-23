// lib/importers-i18n.ts — перевод базы импортёров на язык страницы (на сервере, до передачи в клиентские компоненты).
// Таблицы переводов — data/importers.i18n.json; чего там нет, остаётся как в исходнике.
import type { Company, Country, MarketFact } from './importers';
import type { Locale } from './i18n';
import I from '@/data/importers.i18n.json';

type Tr = Record<string, Partial<Record<string, string>>>;
const T = I as unknown as {
  terms: Tr; countries: Tr; phrases: Tr; volumes: Tr; summaries: Tr; names: Tr; brands: Tr;
  marketLabels: Tr; otherEstimates: Record<string, string>; marketValues: Tr; units: Tr;
};

export const SCALE_KEYS = ['крупнейший', 'крупный', 'средний', 'малый', 'не указан'];
export const RELIABILITY_KEYS = ['высокая', 'средняя', 'низкая'];
export const WORLD = 'Весь мир';

export type ImportersVocab = {
  scale: string[];        // в порядке от крупнейшего; последний — «не указан»
  reliability: string[];
  world: string; my: string; id: string;
};

const look = (map: Tr, key: string | undefined, lang: Locale) => (key == null ? key : map[key]?.[lang] ?? key);

/** Разбивает по запятым вне скобок. */
function splitList(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** Числа в английской/малайской записи: «1,9» → «1.9», «1 100» → «1,100». */
function latinNumbers(s: string, lang: Locale) {
  if (lang !== 'en' && lang !== 'ms') return s;
  return s.replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)[\s  ](\d{3})(?!\d)/g, '$1,$2');
}

const byLength = (keys: string[]) => [...keys].sort((a, b) => b.length - a.length);
const COUNTRY_KEYS = byLength(Object.keys(T.countries));
const PHRASE_KEYS = byLength(Object.keys(T.phrases));

function marketValue(v: string, lang: Locale): string {
  const exact = T.marketValues[v]?.[lang];
  if (exact) return exact;
  let s = v;
  for (const k of COUNTRY_KEYS) if (s.includes(k)) s = s.split(k).join(T.countries[k]?.[lang] ?? k);
  s = s.replace(/тыс\. т/g, T.units.thousand_t?.[lang] ?? 'тыс. т')
    .replace(/зеркальные/g, T.units.mirror?.[lang] ?? 'зеркальные')
    .replace(/(\d) т(?![а-яё])/g, `$1 ${T.units.t?.[lang] ?? 'т'}`);
  return latinNumbers(s, lang);
}

function marketLabel(l: string, lang: Locale): string {
  const m = l.match(/^Другие оценки \((.+)\)$/);
  if (m) return `${T.otherEstimates[lang] ?? 'Другие оценки'} (${m[1]})`;
  return look(T.marketLabels, l, lang)!;
}

function notes(n: string | undefined, lang: Locale, labels: { use: string; brands: string; reliability: string }): string | undefined {
  if (!n) return n;
  const m = n.match(/^Применение: (.*?)\.(?: Бренды и активы: (.*?)\.)?(?: (.*))?$/);
  if (!m) return n;
  const [, app, brands, rest = ''] = m;
  const parts: string[] = [];
  const apps = splitList(app).map(a => T.terms[a.toLowerCase()]?.[lang] ?? a);
  parts.push(`${labels.use}: ${cap(apps.join(', '))}.`);
  if (brands) parts.push(`${labels.brands}: ${look(T.brands, brands, lang)}.`);
  let r = rest.replace(/Достоверность: ([а-яё]+)\./, (_, v: string) => `${labels.reliability}: ${look(T.terms, v, lang)}.`);
  for (const k of PHRASE_KEYS) if (r.includes(k)) r = r.split(k).join(T.phrases[k]?.[lang] ?? k);
  if (r.trim()) parts.push(r.trim());
  return parts.join(' ');
}

export function localizeImporters(countries: Country[], lang: Locale, labels: { use: string; brands: string; reliability: string }):
  { countries: Country[]; vocab: ImportersVocab } {
  const cn = (s: string) => look(T.countries, s, lang)!;
  const term = (s: string) => look(T.terms, s, lang)!;
  const vocab: ImportersVocab = {
    scale: SCALE_KEYS.map(term), reliability: RELIABILITY_KEYS.map(term),
    world: cn(WORLD), my: cn('Малайзия'), id: cn('Индонезия'),
  };
  if (lang === 'ru') return { countries, vocab };
  const co = (c: Company): Company => ({
    ...c,
    name: look(T.names, c.name, lang)!,
    group: c.group && look(T.names, c.group, lang),
    segment: c.segment.map(term),
    products: c.products.map(term),
    volume: c.volume && look(T.volumes, c.volume, lang),
    scale: c.scale && term(c.scale),
    reliability: c.reliability && term(c.reliability),
    notes: notes(c.notes, lang, labels),
  });
  return {
    vocab,
    countries: countries.map(c => ({
      ...c,
      name: cn(c.name),
      summary: T.summaries[c.id]?.[lang] ?? c.summary,
      market: c.market.map((f: MarketFact) => ({ ...f, label: marketLabel(f.label, lang), value: marketValue(f.value, lang) })),
      suppliers1511: c.suppliers1511?.map(s => ({ ...s, name: cn(s.name) })),
      companies: c.companies.map(co),
    })),
  };
}
