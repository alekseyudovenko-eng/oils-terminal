// Таблица котировок, сгруппированная по рынкам.
import Change from './Change';
import { fmtPrice } from '@/lib/format';
import { GROUP_TITLES, type Group } from '@/lib/instruments';
import type { Quote } from '@/lib/quotes';

const ORDER: Group[] = ['palm', 'softoils', 'energy', 'fx'];

export default function QuotesTable({ quotes, compact = false }: { quotes: Quote[]; compact?: boolean }) {
  const groups = ORDER.map(g => ({ g, rows: quotes.filter(q => q.group === g && (q.price != null || !compact)) }))
    .filter(x => x.rows.length > 0);

  const hide = 'hidden md:table-cell';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Котировки фьючерсов и валют</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3 border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">Инструмент</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">Цена</th>
            <th scope="col" className="py-2 px-3 font-normal">Единица</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">USD/т</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">День</th>
            <th scope="col" className={`py-2 px-3 font-normal text-right ${hide}`}>Неделя</th>
            <th scope="col" className={`py-2 px-3 font-normal text-right ${hide}`}>Месяц</th>
            <th scope="col" className={`py-2 pl-3 font-normal text-right ${hide}`}>С начала года</th>
          </tr>
        </thead>
        {groups.map(({ g, rows }) => (
          <tbody key={g} className="border-b border-rule last:border-b-0">
            <tr>
              <th scope="rowgroup" colSpan={8} className="pt-5 pb-1 text-left font-cond text-base font-semibold text-ink">
                {GROUP_TITLES[g]}
              </th>
            </tr>
            {rows.map(q => (
              <tr key={q.id} className={q.id === 'fcpo' ? 'bg-gold-soft/60' : ''}>
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  <span className="text-ink">{q.name}</span>
                  <span className="block text-xs text-ink-3">{q.venue}</span>
                </th>
                <td className="py-2 px-3 text-right font-cond text-base font-medium num">{fmtPrice(q.price)}</td>
                <td className="py-2 px-3 text-ink-3 whitespace-nowrap">{q.unit}</td>
                <td className="py-2 px-3 text-right num text-ink-2">{fmtPrice(q.usdT)}</td>
                <td className="py-2 px-3 text-right"><Change value={q.changePct} /></td>
                <td className={`py-2 px-3 text-right ${hide}`}><Change value={q.perfW} /></td>
                <td className={`py-2 px-3 text-right ${hide}`}><Change value={q.perf1M} /></td>
                <td className={`py-2 pl-3 text-right ${hide}`}><Change value={q.perfYTD} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
