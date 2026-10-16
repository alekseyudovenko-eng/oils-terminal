import Marquee from './Marquee';
import Change from './Change';
import { fmtPrice, fmtSigned } from '@/lib/format';
import type { QuotesResult } from '@/lib/quotes';

export default function QuoteTicker({ data }: { data: QuotesResult }) {
  const items = [
    ...data.quotes.filter(q => q.price != null).map(q => ({
      key: q.id, label: q.short, value: fmtPrice(q.price), change: <Change value={q.changePct} arrow />,
      highlight: q.id === 'fcpo',
    })),
    ...data.spreads.filter(s => s.value != null).map(s => ({
      key: s.id, label: s.short, value: `${fmtSigned(s.value)} $/т`,
      change: <Change value={s.change} kind="abs" arrow />, highlight: s.id === 'pogo',
    })),
  ];

  if (items.length === 0) {
    return (
      <div className="bg-band text-band-muted border-t border-white/10 text-sm">
        <p className="mx-auto max-w-page px-4 sm:px-6 py-2">Котировки сейчас недоступны. Страница обновится автоматически.</p>
      </div>
    );
  }

  return (
    <Marquee label="Котировки" seconds={Math.max(40, items.length * 5)} className="bg-band text-band-text border-t border-white/10">
      {items.map(i => (
        <span key={i.key} className="flex items-baseline gap-2 px-5 py-2 text-sm whitespace-nowrap border-r border-white/10">
          <span className={i.highlight ? 'text-[#e2b955] font-medium' : 'text-band-muted'}>{i.label}</span>
          <span className="num font-cond font-medium text-base">{i.value}</span>
          <span className="[&_.text-up]:text-[#6fcf97] [&_.text-down]:text-[#f08a7e] [&_.text-ink-3]:text-band-muted">{i.change}</span>
        </span>
      ))}
    </Marquee>
  );
}
