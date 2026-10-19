'use client';
// Таблица импортёров: вкладки стран, поиск и фильтр по сегменту.
import { useMemo, useState } from 'react';
import type { Country } from '@/lib/importers';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export default function ImportersExplorer({ countries }: { countries: Country[] }) {
  const [cid, setCid] = useState(countries[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('');
  const country = countries.find(c => c.id === cid) ?? countries[0];

  const segments = useMemo(() => {
    const m = new Map<string, number>();
    for (const co of country?.companies ?? []) for (const s of co.segment) m.set(s, (m.get(s) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [country]);

  const list = useMemo(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    return (country?.companies ?? []).filter(co => {
      if (seg && !co.segment.includes(seg)) return false;
      if (!toks.length) return true;
      const hay = norm([co.name, co.group, co.city, co.segment.join(' '), co.products.join(' '), co.notes].join(' '));
      return toks.every(t => hay.includes(t));
    });
  }, [country, q, seg]);

  if (!country) return null;

  return (
    <div>
      <div role="tablist" aria-label="Страна" className="flex flex-wrap gap-2 border-b border-rule">
        {countries.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === country.id}
            onClick={() => { setCid(c.id); setSeg(''); setQ(''); }}
            className={`px-3 py-2 -mb-px border-b-2 text-sm ${c.id === country.id ? 'border-gold text-ink font-medium' : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {c.name} <span className="num text-ink-3">{c.companies.length}</span>
          </button>
        ))}
      </div>

      <div className="py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-cond text-2xl font-semibold tracking-tight">{country.name}</h2>
          {country.summary && <p className="mt-2 text-ink-2 max-w-[70ch]">{country.summary}</p>}
        </div>
        {country.market.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm self-start">
            {country.market.map(f => (
              <div key={f.label} className="contents">
                <dt className="text-ink-3">{f.label}</dt>
                <dd className="num">
                  {f.source ? <a href={f.source} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{f.value}</a> : f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {country.companies.length === 0 ? (
        <p className="py-10 text-center text-ink-3 border border-dashed border-rule rounded">
          Список компаний по стране {country.name} ещё не загружен.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Компания, город, продукт"
              aria-label="Поиск по компаниям"
              className="w-full sm:w-72 rounded border border-rule bg-panel px-3 py-1.5 text-sm" />
            {segments.map(([s, n]) => (
              <button key={s} type="button" aria-pressed={seg === s} onClick={() => setSeg(seg === s ? '' : s)}
                className={`rounded-full border px-3 py-1 text-xs ${seg === s ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-2 hover:border-ink-3'}`}>
                {s} <span className="num opacity-70">{n}</span>
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <caption className="sr-only">Импортёры и покупатели растительных масел: {country.name}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-4 font-normal">Компания</th>
                  <th scope="col" className="py-2 px-4 font-normal">Сегмент</th>
                  <th scope="col" className="py-2 px-4 font-normal">Масла и жиры</th>
                  <th scope="col" className="py-2 px-4 font-normal">Объём</th>
                  <th scope="col" className="py-2 pl-4 font-normal">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {list.map(co => (
                  <tr key={co.name} className="align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <span className="block font-medium text-ink">
                        {co.website ? <a href={co.website} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{co.name}</a> : co.name}
                      </span>
                      <span className="block text-xs text-ink-3">{[co.group, co.city].filter(Boolean).join(' · ')}</span>
                      {co.contacts && <span className="block text-xs text-ink-3">{co.contacts}</span>}
                    </th>
                    <td className="py-3 px-4 text-ink-2">{co.segment.join(', ')}</td>
                    <td className="py-3 px-4 text-ink-2">{co.products.join(', ')}</td>
                    <td className="py-3 px-4 num whitespace-nowrap">{co.volume ?? '—'}</td>
                    <td className="py-3 pl-4 text-ink-2 max-w-[38ch]">
                      {co.notes}
                      {(co.sources?.length || co.checkedAt) && (
                        <span className="block mt-1 text-xs text-ink-3">
                          {co.sources?.map((s, i) => (
                            <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="underline decoration-rule hover:text-gold mr-2">
                              источник{co.sources!.length > 1 ? ` ${i + 1}` : ''}
                            </a>
                          ))}
                          {co.checkedAt && <>проверено {new Date(co.checkedAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="py-6 text-center text-ink-3">Ничего не найдено.</p>}
          </div>
        </>
      )}
    </div>
  );
}
