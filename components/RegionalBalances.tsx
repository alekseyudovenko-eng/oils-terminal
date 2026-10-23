'use client';
// Региональные балансы растительных масел (собственные оценки на основе USDA GAIN, Eurostat и нацстатистики).
import { useState } from 'react';
import { DATASETS } from '@/lib/regional-data';
import { fmtInt } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import type { Dict } from '@/lib/dict';

type Key = keyof typeof DATASETS;
const ORDER: Key[] = ['ca', 'cau', 'eeu', 'baltic', 'eu'];

type Row = { name: string; crops: string; src: string; prod_oil: number; imp: number; exp: number; cons: number };

export default function RegionalBalances({ lang, t }: { lang: Locale; t: Dict['regional'] }) {
  const c = t.cols;
  const n = (v: number) => fmtInt(v, lang);
  const [key, setKey] = useState<Key>('ca');
  const ds = DATASETS[key] as unknown as {
    title: string; sub: string; yieldNote: string; note: string;
    srcBox: { code: string; text: string }[];
    aggRow: (Omit<Row, 'name' | 'crops'> & { label: string }) | null;
    rows: Row[];
  };

  return (
    <div className="grid gap-4">
      <div role="radiogroup" aria-label={t.region} className="inline-flex flex-wrap w-fit rounded-sm border border-rule bg-panel p-0.5 text-sm">
        {ORDER.map(id => (
          <button key={id} type="button" role="radio" aria-checked={id === key} onClick={() => setKey(id)}
            className={`px-3 py-1.5 rounded-[2px] transition-colors ${id === key ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>
            {t.regions[id]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="text-left pb-2">
            <span className="block font-cond text-lg font-semibold">{ds.title}</span>
            <span className="block text-sm text-ink-2">{ds.sub}</span>
          </caption>
          <thead>
            <tr className="text-xs text-ink-3 border-b border-rule">
              <th scope="col" className="py-2 pr-4 text-left font-normal">{c.country}</th>
              <th scope="col" className="py-2 px-3 text-left font-normal hidden md:table-cell">{c.crops}</th>
              <th scope="col" className="py-2 px-3 text-right font-normal">{c.production}</th>
              <th scope="col" className="py-2 px-3 text-right font-normal">{c.imports}</th>
              <th scope="col" className="py-2 px-3 text-right font-normal">{c.exports}</th>
              <th scope="col" className="py-2 px-3 text-right font-normal">{c.consumption}</th>
              <th scope="col" className="py-2 pl-3 text-right font-normal" title={c.srcTitle}>{c.src}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {ds.aggRow && (
              <tr className="bg-gold-soft/50 font-medium">
                <th scope="row" className="py-2 pr-4 text-left">{ds.aggRow.label}</th>
                <td className="py-2 px-3 hidden md:table-cell" />
                <td className="py-2 px-3 text-right num">{n(ds.aggRow.prod_oil)}</td>
                <td className="py-2 px-3 text-right num">{n(ds.aggRow.imp)}</td>
                <td className="py-2 px-3 text-right num">{n(ds.aggRow.exp)}</td>
                <td className="py-2 px-3 text-right num">{n(ds.aggRow.cons)}</td>
                <td className="py-2 pl-3 text-right text-ink-3">{ds.aggRow.src}</td>
              </tr>
            )}
            {ds.rows.map(r => (
              <tr key={r.name}>
                <th scope="row" className="py-2 pr-4 text-left font-normal">{r.name}</th>
                <td className="py-2 px-3 text-ink-2 hidden md:table-cell">{r.crops}</td>
                <td className="py-2 px-3 text-right num">{n(r.prod_oil)}</td>
                <td className="py-2 px-3 text-right num">{n(r.imp)}</td>
                <td className="py-2 px-3 text-right num">{n(r.exp)}</td>
                <td className="py-2 px-3 text-right num">{n(r.cons)}</td>
                <td className="py-2 pl-3 text-right text-ink-3">{r.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-ink-2 grid gap-1 max-w-[80ch]">
        {t.dataLang && <p className="text-ink-3">{t.dataLang}</p>}
        <p>{ds.note}</p>
        <p>{ds.yieldNote}</p>
        <dl className="grid grid-cols-[2.5rem_1fr] gap-x-2 gap-y-0.5 mt-1">
          {ds.srcBox.map(s => (
            <div key={s.code} className="contents">
              <dt className="text-ink-3">{s.code}</dt>
              <dd>{s.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
