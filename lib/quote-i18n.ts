// Подписи котировок и спредов на языке сайта. Кэш котировок хранит русские названия,
// поэтому на странице подставляем переводы по id инструмента.
import type { Dict } from './dict';
import { fill } from './dict';
import type { Locale } from './i18n';
import { INTL } from './i18n';
import type { Quote, Spread } from './quotes';

export function instText(t: Dict, q: Pick<Quote, 'id' | 'name' | 'short' | 'venue' | 'unit'>) {
  const x = (t.quotes.inst as Record<string, { name: string; short: string; venue: string; unit: string } | undefined>)[q.id];
  return x ?? { name: q.name, short: q.short, venue: q.venue, unit: q.unit };
}

export function spreadText(t: Dict, s: Spread, lang: Locale) {
  const g = s.proxy ? t.spreads.gasoilUlsd : t.spreads.gasoilIce;
  const formula = s.id === 'soy_palm' ? t.spreads.formula.soy_palm
    : fill(s.id === 'bogo' ? t.spreads.formula.bogo : t.spreads.formula.pogo, { g });
  const name = s.id === 'soy_palm' ? t.spreads.soyPalm : s.name;
  const short = s.id === 'soy_palm' ? t.spreads.soyPalmShort : s.short;
  let explain: string | null = null;
  if (s.id === 'pogo' && s.value != null) {
    const v = Math.abs(s.value).toLocaleString(INTL[lang]);
    explain = fill(s.value < 0 ? t.hero.cheaper : t.hero.dearer, { v });
  }
  return { name, short, formula, explain };
}
