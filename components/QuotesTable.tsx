// Таблица котировок, сгруппированная по рынкам.
import Change from './Change';
import { fmtPrice } from '@/lib/format';
import type { Group } from '@/lib/instruments';
import type { Quote } from '@/lib/quotes';
import { getDict } from '@/lib/i18n-server';
import { instText } from '@/lib/quote-i18n';

const ORDER: Group[] = ['palm', 'softoils', 'energy', 'fx'];

export default function QuotesTable({ quotes }: { quotes: Quote[] }) {
  const { lang, t } = getDict();
  const c = t.quotes.cols;
  // Инструменты, по которым источник не вернул цену, не показываем (пустые строки с прочерками
  // только мешают). Если цен нет совсем — показываем все строки: над таблицей будет сообщение об ошибке.
  const anyPrice = quotes.some(q => q.price != null);
  const groups = ORDER.map(g => ({ g, rows: quotes.filter(q => q.group === g && (q.price != null || !anyPrice)) }))
    .filter(x => x.rows.length > 0);

  const hide = 'hidden md:table-cell';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t.quotes.caption}</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3 border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">{c.instrument}</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">{c.price}</th>
            <th scope="col" className="py-2 px-3 font-normal">{c.unit}</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">USD/{t.t}</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">{c.day}</th>
            <th scope="col" className={`py-2 px-3 font-normal text-right ${hide}`}>{c.week}</th>
            <th scope="col" className={`py-2 px-3 font-normal text-right ${hide}`}>{c.month}</th>
            <th scope="col" className={`py-2 pl-3 font-normal text-right ${hide}`}>{c.ytd}</th>
          </tr>
        </thead>
        {groups.map(({ g, rows }) => (
          <tbody key={g} className="border-b border-rule last:border-b-0">
            <tr>
              <th scope="rowgroup" colSpan={8} className="pt-5 pb-1 text-left font-cond text-base font-semibold text-ink">
                {t.quotes.groups[g]}
              </th>
            </tr>
            {rows.map(q => {
              const it = instText(t, q);
              return (
                <tr key={q.id} className={q.id === 'fcpo' ? 'bg-gold-soft/60' : ''}>
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    <span className="text-ink">{it.name}</span>
                    <span className="block text-xs text-ink-3">{it.venue}</span>
                  </th>
                  <td className="py-2 px-3 text-right font-cond text-base font-medium num">{fmtPrice(q.price, lang)}</td>
                  <td className="py-2 px-3 text-ink-3 whitespace-nowrap">{it.unit}</td>
                  <td className="py-2 px-3 text-right num text-ink-2">{fmtPrice(q.usdT, lang)}</td>
                  <td className="py-2 px-3 text-right"><Change value={q.changePct} lang={lang} /></td>
                  <td className={`py-2 px-3 text-right ${hide}`}><Change value={q.perfW} lang={lang} /></td>
                  <td className={`py-2 px-3 text-right ${hide}`}><Change value={q.perf1M} lang={lang} /></td>
                  <td className={`py-2 pl-3 text-right ${hide}`}><Change value={q.perfYTD} lang={lang} /></td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
