// Календарь рынка: ближайшие отчёты (WASDE, MPOB, сюрвейеры, референсная цена Малайзии) и сроки регулирования ЕС.
import { upcomingEvents, type CalEvent } from '@/lib/market-calendar';
import type { Locale } from '@/lib/i18n';
import { INTL } from '@/lib/i18n';
import { fill } from '@/lib/dict';
import { EXTRA } from '@/lib/dict-extra';

export default function MarketCalendar({ lang, days = 30, max = 10 }: { lang: Locale; days?: number; max?: number }) {
  const x = EXTRA[lang].cal;
  const today = new Date().toISOString().slice(0, 10);
  const label = (e: CalEvent) => {
    if (e.kind === 'reg') return e.key === 'eudr' ? x.eudr : x.contaminants;
    if (e.kind === 'cargo') return e.key === 'monthEnd' ? x.monthEnd : fill(x.cargo, { d: Number(e.date.slice(8, 10)) });
    return x[e.kind];
  };
  // Сюрвейеры выходят 5 раз в месяц: показываем только ближайший выпуск, чтобы не забивать список.
  const all = upcomingEvents(new Date(), days);
  const firstCargo = all.find(e => e.kind === 'cargo');
  const events = all.filter(e => e.kind !== 'cargo' || e === firstCargo).slice(0, max);
  return (
    <section aria-labelledby="cal-title" className="py-8 border-b border-rule">
      <h2 id="cal-title" className="font-cond text-2xl font-semibold tracking-tight">{x.title}</h2>
      <p className="text-sm text-ink-2 mb-3">{x.note}</p>
      <ol className="divide-y divide-rule text-sm">
        {events.map(e => (
          <li key={`${e.date}-${e.kind}-${e.key ?? ''}`} className="flex gap-3 py-2">
            <time dateTime={e.date} className="w-20 shrink-0 text-ink-2 num">
              {e.approx ? '≈ ' : ''}{new Date(e.date + 'T00:00:00Z').toLocaleDateString(INTL[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' })}
              {e.date === today && <span className="block text-xs text-gold">{x.today}</span>}
            </time>
            <span className={e.kind === 'wasde' || e.kind === 'mpob' ? 'text-ink font-medium' : 'text-ink'}>{label(e)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
