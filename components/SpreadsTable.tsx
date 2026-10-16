import Change from './Change';
import { fmtSigned } from '@/lib/format';
import type { Spread } from '@/lib/quotes';

export default function SpreadsTable({ spreads }: { spreads: Spread[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Спреды в долларах за тонну</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3 border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">Спред</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">USD/т</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">За день</th>
            <th scope="col" className="py-2 pl-3 font-normal">Как считается</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {spreads.map(s => (
            <tr key={s.id}>
              <th scope="row" className="py-2 pr-4 text-left font-medium">{s.name}</th>
              <td className={`py-2 px-3 text-right font-cond text-base font-medium num ${s.id === 'pogo' ? 'text-gold' : ''}`}>{fmtSigned(s.value)}</td>
              <td className="py-2 px-3 text-right"><Change value={s.change} kind="abs" /></td>
              <td className="py-2 pl-3 text-ink-2">{s.formula}{s.proxy && <span className="text-ink-3"> (оценка по ULSD)</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
