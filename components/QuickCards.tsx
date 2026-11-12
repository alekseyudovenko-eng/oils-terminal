// Быстрые карточки: ключевые инструменты с ценой, изменением за день и мини-графиком за 30 дней.
import Change from './Change';
import { fmtPrice } from '@/lib/format';
import type { QuotesResult } from '@/lib/quotes';
import { getPriceHistory } from '@/lib/price-history';
import { getDict } from '@/lib/i18n-server';
import { instText } from '@/lib/quote-i18n';
import { localePath } from '@/lib/i18n';
import { QUICK } from '@/lib/dict-quick';

export const QUICK_IDS = ['fcpo', 'dce_olein', 'zl', 'brent', 'usdmyr'] as const;

function Mini({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-8" aria-hidden="true" />;
  const W = 120, H = 32, P = 2;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(P + (i / (values.length - 1)) * (W - 2 * P)).toFixed(1)},${(P + (1 - (v - min) / span) * (H - 2 * P)).toFixed(1)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" aria-hidden="true" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={up ? 'var(--up, #1a7f4b)' : 'var(--down, #b3261e)'} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default async function QuickCards({ quotes }: { quotes: QuotesResult }) {
  const { lang, t } = getDict();
  const x = QUICK[lang];
  const items = QUICK_IDS.map(id => quotes.quotes.find(q => q.id === id)).filter(q => q && q.price != null);
  if (items.length === 0) return null;
  const hist = await Promise.all(items.map(q => getPriceHistory(q!.id)));
  return (
    <section aria-label={x.cardsTitle} className="pt-6">
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {items.map((q, i) => {
          const it = instText(t, q!);
          const vals = hist[i].slice(-30).map(p => p.c);
          return (
            <li key={q!.id} className="snap-start shrink-0 w-44">
              <a href={localePath(lang, `/chart/${q!.id}`)} title={x.open}
                className="block rounded border border-rule bg-panel p-3 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-sm">
                <span className="block text-sm text-ink truncate">{it.name}</span>
                <span className="block text-xs text-ink-3 truncate">{it.venue}</span>
                <span className="mt-1 block font-cond text-2xl font-semibold num">{fmtPrice(q!.price, lang)}</span>
                <span className="block text-xs"><Change value={q!.changePct} lang={lang} /> <span className="text-ink-3">{it.unit}</span></span>
                <span className="mt-2 block"><Mini values={vals} /></span>
                <span className="block text-[11px] text-ink-3">{x.days30}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
