// Блок «Регион»: экспорт пальмовой продукции Малайзии и Индонезии в Россию, Центральную Азию, Кавказ и Черноморье.
import type { RegionData } from '@/lib/market-cards';
import type { Locale } from '@/lib/i18n';
import { INTL } from '@/lib/i18n';
import { fill } from '@/lib/dict';
import { EXTRA } from '@/lib/dict-extra';

const ISO2: Record<string, string> = { RUS: 'RU', UZB: 'UZ', KAZ: 'KZ', KGZ: 'KG', TJK: 'TJ', TKM: 'TM', AZE: 'AZ', GEO: 'GE', ARM: 'AM', UKR: 'UA', BLR: 'BY', TUR: 'TR' };

export default function RegionBlock({ data, lang }: { data: RegionData | null; lang: Locale }) {
  if (!data || !data.rows.length) return null;
  const x = EXTRA[lang].region;
  const names = new Intl.DisplayNames([INTL[lang], 'en'], { type: 'region' });
  const n = (v: number) => v.toLocaleString(INTL[lang], { maximumFractionDigits: v < 10 ? 1 : 0 });
  const pct = (a: number, b: number) => (b > 0.05 ? ((a - b) / b) * 100 : null);
  const mName = new Date(Date.UTC(2000, data.ytdMonth - 1, 1)).toLocaleDateString(INTL[lang], { month: 'short', timeZone: 'UTC' });
  const tot = data.rows.reduce((a, r) => ({ full: a.full + r.full, fullMy: a.fullMy + r.fullMy, ytd: a.ytd + r.ytd, ytdPrev: a.ytdPrev + r.ytdPrev }), { full: 0, fullMy: 0, ytd: 0, ytdPrev: 0 });
  const Row = ({ label, r, strong = false }: { label: string; r: { full: number; fullMy: number; ytd: number; ytdPrev: number }; strong?: boolean }) => {
    const c = pct(r.ytd, r.ytdPrev);
    return (
      <tr className={strong ? 'font-medium border-t border-rule' : ''}>
        <th scope="row" className="py-1.5 pr-3 text-left font-normal">{label}</th>
        <td className="py-1.5 px-2 text-right num">{n(r.full)}</td>
        <td className="py-1.5 px-2 text-right num text-ink-2">{r.full > 0 ? Math.round((r.fullMy / r.full) * 100) + '%' : '—'}</td>
        <td className="py-1.5 px-2 text-right num">{n(r.ytd)}</td>
        <td className={`py-1.5 pl-2 text-right num ${c == null ? 'text-ink-3' : c >= 0 ? 'text-up' : 'text-down'}`}>{c == null ? '—' : `${c >= 0 ? '+' : '−'}${Math.abs(Math.round(c))}%`}</td>
      </tr>
    );
  };
  return (
    <section id="region" aria-labelledby="region-title" className="py-8 border-b border-rule">
      <h2 id="region-title" className="font-cond text-2xl font-semibold tracking-tight">{x.title}</h2>
      <p className="text-sm text-ink-2 mb-4 max-w-[75ch]">{x.note}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-3 border-b border-rule">
              <th scope="col" className="py-2 pr-3 text-left font-normal">{x.country}</th>
              <th scope="col" className="py-2 px-2 text-right font-normal">{fill(x.full, { y: data.fullYear })}</th>
              <th scope="col" className="py-2 px-2 text-right font-normal">{x.my}</th>
              <th scope="col" className="py-2 px-2 text-right font-normal">{fill(x.ytd, { m: mName, y: data.year })}</th>
              <th scope="col" className="py-2 pl-2 text-right font-normal">{x.chg}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(r => <Row key={r.iso} label={names.of(ISO2[r.iso] || r.iso) || r.iso} r={r} />)}
            <Row label={x.total} r={tot} strong />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-3 mt-3">{x.src}</p>
    </section>
  );
}
