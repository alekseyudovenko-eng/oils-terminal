// Карточка MPOB: запасы, производство и экспорт Малайзии за последний месяц (публичный релиз MPOB).
import type { MpobMonth } from '@/lib/market-cards';
import type { Locale } from '@/lib/i18n';
import { INTL } from '@/lib/i18n';
import { fill } from '@/lib/dict';
import { EXTRA } from '@/lib/dict-extra';

function Pct({ v, lang, label }: { v: number | null; lang: Locale; label: string }) {
  if (v == null) return null;
  const s = `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString(INTL[lang], { maximumFractionDigits: 2 })}%`;
  return <span className={`text-xs ${v >= 0 ? 'text-up' : 'text-down'}`}>{s} <span className="text-ink-3">{label}</span></span>;
}

export default function MpobCard({ data, lang, nextDate }: { data: MpobMonth | null; lang: Locale; nextDate: string | null }) {
  if (!data) return null;
  const x = EXTRA[lang].mpob;
  const month = new Date(data.month + 'T00:00:00Z').toLocaleDateString(INTL[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const mt = (t: number | null) => (t == null ? '—' : (t / 1e6).toLocaleString(INTL[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const items = [
    { k: x.stocks, v: data.stocks_t, mom: data.stocks_mom_pct, yoy: data.stocks_yoy_pct },
    { k: x.production, v: data.production_t, mom: data.production_mom_pct, yoy: data.production_yoy_pct },
    { k: x.exports, v: data.exports_t, mom: data.exports_mom_pct, yoy: data.exports_yoy_pct },
  ];
  return (
    <section aria-labelledby="mpob-title" className="py-8 border-b border-rule">
      <h2 id="mpob-title" className="font-cond text-2xl font-semibold tracking-tight mb-4">{fill(x.title, { month })}</h2>
      <dl className="grid grid-cols-3 gap-3">
        {items.map(it => (
          <div key={it.k} className="rounded border border-rule bg-panel p-3">
            <dt className="text-xs text-ink-2 leading-snug min-h-[2.5em]">{it.k}</dt>
            <dd className="mt-1">
              <span className="font-cond text-2xl font-semibold num">{mt(it.v)}</span> <span className="text-xs text-ink-3">{x.unit}</span>
              <span className="block"><Pct v={it.mom} lang={lang} label={x.mom} /></span>
              <span className="block"><Pct v={it.yoy} lang={lang} label={x.yoy} /></span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-3 mt-3">
        {data.source_url ? <a href={data.source_url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-gold">{x.source}</a> : x.source}
        {nextDate && <> {fill(x.next, { date: new Date(nextDate + 'T00:00:00Z').toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' }) })}</>}
      </p>
    </section>
  );
}
