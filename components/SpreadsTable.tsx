import Change from './Change';
import { fmtSigned } from '@/lib/format';
import type { Spread } from '@/lib/quotes';
import { getDict } from '@/lib/i18n-server';
import { spreadText } from '@/lib/quote-i18n';

export default function SpreadsTable({ spreads }: { spreads: Spread[] }) {
  const { lang, t } = getDict();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t.spreads.caption}</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3 border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">{t.spreads.cols.spread}</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">USD/{t.t}</th>
            <th scope="col" className="py-2 px-3 font-normal text-right">{t.spreads.cols.day}</th>
            <th scope="col" className="py-2 pl-3 font-normal">{t.spreads.cols.how}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {spreads.map(s => {
            const st = spreadText(t, s, lang);
            return (
              <tr key={s.id}>
                <th scope="row" className="py-2 pr-4 text-left font-medium">{st.name}</th>
                <td className={`py-2 px-3 text-right font-cond text-base font-medium num ${s.id === 'pogo' ? 'text-gold' : ''}`}>{fmtSigned(s.value, 0, lang)}</td>
                <td className="py-2 px-3 text-right"><Change value={s.change} kind="abs" lang={lang} /></td>
                <td className="py-2 pl-3 text-ink-2">{st.formula}{s.proxy && <span className="text-ink-3"> {t.spreads.ulsdNote}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
