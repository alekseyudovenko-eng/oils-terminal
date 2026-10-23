'use client';
// Страны и нормы регуляторной базы: таблица стран по блокам и фильтруемый список норм.
// Нажатие на страну выбирает её в фильтре — в списке остаются её нормы и общие нормы её блока.
import { useMemo, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { Bloc, ClaimUse, MeasureType, Status } from '@/lib/regulation';

type C = { code: string; bloc: Bloc; name: string; phrase: string; use: ClaimUse; summary: string; practice: string };
type M = { id: string; scope: string; scopeName: string; type: MeasureType; status: Status; date: string; act: string; title: string; text: string; url: string };

export type RegLabels = {
  filters: { country: string; allCountries: string; status: string; allStatuses: string; type: string; allTypes: string; reset: string };
  cols: { country: string; bloc: string; phrase: string; claimUse: string; rules: string; practice: string; count: string };
  blocs: Record<Bloc, string>;
  blocScope: Record<'EU' | 'EAEU', string>;
  use: Record<ClaimUse, string>;
  status: Record<Status, string>;
  types: Record<MeasureType, string>;
  act: string; date: string; noDate: string; source: string; applies: string; found: string; none: string;
  countriesTitle: string; countriesNote: string; measuresTitle: string;
};

const BLOCS: Bloc[] = ['EU', 'EAEU', 'other'];
const STATUSES: Status[] = ['in_force', 'upcoming', 'proposal'];
const LEVEL: Record<ClaimUse, number> = { high: 3, medium: 2, low: 1, none: 0, nodata: -1 };
const STATUS_STYLE: Record<Status, string> = {
  in_force: 'bg-panel text-up border-up',
  upcoming: 'bg-gold-soft text-gold border-gold',
  proposal: 'bg-paper text-ink-2 border-rule',
};

function UseMeter({ use, label }: { use: ClaimUse; label: string }) {
  const lvl = LEVEL[use];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        {[1, 2, 3].map(i => (
          <span key={i} className={`h-2.5 w-2 rounded-[1px] ${
            lvl < 0 ? 'border border-dashed border-ink-3' : i <= lvl ? 'bg-gold' : 'bg-rule'
          }`} />
        ))}
      </span>
      <span className={lvl < 0 ? 'text-ink-3' : ''}>{label}</span>
    </span>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-ink-3">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="rounded-sm border border-rule bg-panel px-2.5 py-1.5 text-sm text-ink min-w-[11rem]">
        {children}
      </select>
    </label>
  );
}

export default function RegulationExplorer({ countries, measures, t }: { lang: Locale; countries: C[]; measures: M[]; t: RegLabels }) {
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const listRef = useRef<HTMLElement>(null);

  const countFor = (c: C) => measures.filter(m => m.scope === c.code || m.scope === c.bloc).length;
  const types = useMemo(() => Array.from(new Set(measures.map(m => m.type))), [measures]);

  const shown = useMemo(() => {
    const c = countries.find(x => x.code === country);
    return measures
      .filter(m => !c || m.scope === c.code || m.scope === c.bloc)
      .filter(m => !status || m.status === status)
      .filter(m => !type || m.type === type)
      .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));
  }, [countries, measures, country, status, type]);

  function pick(code: string) {
    setCountry(code);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const appliesTo = (m: M) => (m.scope === 'EU' || m.scope === 'EAEU' ? t.blocScope[m.scope] : m.scopeName);

  return (
    <>
      <section aria-labelledby="countries-title" className="py-8 border-b border-rule">
        <h2 id="countries-title" className="font-cond text-2xl font-semibold tracking-tight">{t.countriesTitle}</h2>
        <p className="mt-1 mb-4 text-sm text-ink-2 max-w-[75ch]">{t.countriesNote}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3 border-b border-rule">
                <th scope="col" className="py-2 pr-4 font-normal">{t.cols.country}</th>
                <th scope="col" className="py-2 px-3 font-normal">{t.cols.phrase}</th>
                <th scope="col" className="py-2 px-3 font-normal">{t.cols.claimUse}</th>
                <th scope="col" className="py-2 px-3 font-normal hidden lg:table-cell">{t.cols.rules}</th>
                <th scope="col" className="py-2 pl-3 font-normal text-right">{t.cols.count}</th>
              </tr>
            </thead>
            {BLOCS.map(b => (
              <tbody key={b} className="border-b border-rule last:border-b-0">
                <tr>
                  <th scope="rowgroup" colSpan={5} className="pt-5 pb-1 text-left font-cond text-base font-semibold">{t.blocs[b]}</th>
                </tr>
                {countries.filter(c => c.bloc === b).map(c => (
                  <tr key={c.code} className={`align-top ${country === c.code ? 'bg-gold-soft/60' : 'hover:bg-panel'}`}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      <button type="button" onClick={() => pick(c.code)} aria-pressed={country === c.code}
                        className="text-ink underline decoration-rule underline-offset-4 hover:decoration-gold hover:text-gold text-left">
                        {c.name}
                      </button>
                    </th>
                    <td className="py-2 px-3 text-ink-2 italic">{c.phrase}</td>
                    <td className="py-2 px-3"><UseMeter use={c.use} label={t.use[c.use]} /></td>
                    <td className="py-2 px-3 text-ink-2 hidden lg:table-cell max-w-[46ch]">{c.summary}</td>
                    <td className="py-2 pl-3 text-right num">{countFor(c)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section ref={listRef} aria-labelledby="measures-title" className="py-8 scroll-mt-4">
        <h2 id="measures-title" className="font-cond text-2xl font-semibold tracking-tight">{t.measuresTitle}</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Select label={t.filters.country} value={country} onChange={setCountry}>
            <option value="">{t.filters.allCountries}</option>
            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select label={t.filters.status} value={status} onChange={setStatus}>
            <option value="">{t.filters.allStatuses}</option>
            {STATUSES.map(s => <option key={s} value={s}>{t.status[s]}</option>)}
          </Select>
          <Select label={t.filters.type} value={type} onChange={setType}>
            <option value="">{t.filters.allTypes}</option>
            {types.map(x => <option key={x} value={x}>{t.types[x]}</option>)}
          </Select>
          {(country || status || type) && (
            <button type="button" onClick={() => { setCountry(''); setStatus(''); setType(''); }}
              className="pb-1.5 text-sm text-ink-2 underline underline-offset-2 hover:text-gold">{t.filters.reset}</button>
          )}
        </div>

        {country && (() => {
          const c = countries.find(x => x.code === country)!;
          return (
            <div className="mt-5 border-l-2 border-gold pl-4 max-w-[80ch] text-sm">
              <p className="font-medium">{c.name}: {c.summary}</p>
              <p className="mt-1 text-ink-2">{t.cols.practice}: {c.practice}</p>
            </div>
          );
        })()}

        <p className="mt-5 text-xs text-ink-3" aria-live="polite">{t.found.replace('{n}', String(shown.length))}</p>
        {shown.length === 0 ? <p className="py-6 text-ink-2">{t.none}</p> : (
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {shown.map(m => (
              <li key={m.id} className="py-4 grid gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-sm border px-1.5 py-0.5 font-medium ${STATUS_STYLE[m.status]}`}>{t.status[m.status]}</span>
                    <span className="text-ink-3">{t.types[m.type]}</span>
                  </div>
                  <h3 className="mt-1.5 font-medium text-ink">{m.title}</h3>
                  <p className="mt-1 text-sm text-ink-2 max-w-[75ch]">{m.text}</p>
                </div>
                <dl className="text-xs grid grid-cols-[auto_1fr] md:grid-cols-1 gap-x-3 gap-y-1 content-start">
                  <dt className="text-ink-3">{t.applies}</dt><dd>{appliesTo(m)}</dd>
                  <dt className="text-ink-3 md:mt-1">{t.date}</dt><dd className="num">{m.date || t.noDate}</dd>
                  <dt className="text-ink-3 md:mt-1">{t.act}</dt><dd>{m.act}</dd>
                  {m.url && <><dt className="text-ink-3 md:mt-1">{t.source}</dt>
                    <dd><a href={m.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline underline-offset-2 hover:text-gold break-all">{new URL(m.url).hostname.replace(/^www\./, '')}</a></dd></>}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
