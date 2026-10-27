'use client';
// Балансы USDA: переключение масла и сезона.
import { useState } from 'react';
import type { OilView } from '@/lib/psd-view';
import { myLabel, type Metric } from '@/lib/psd-meta';
import { fmtInt } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

const TOP: Metric[] = ['production', 'exports', 'imports', 'consumption'];

/** Подписи приходят с сервера уже на языке сайта. */
export type PsdLabels = {
  oil: string; season: string; noOil: string; world: string; indicator: string; noData: string; focus: string; country: string;
  top: Record<'production' | 'exports' | 'imports' | 'consumption', string>;
  metricList: { id: Metric; label: string }[];
};

function Tabs<T extends string | number>({
  label, options, value, onChange,
}: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-sm border border-rule bg-panel p-0.5 text-sm">
      {options.map(o => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-[2px] transition-colors ${o.id === value ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PsdExplorer({ views, lang, t }: { views: OilView[]; lang: Locale; t: PsdLabels }) {
  const METRICS = t.metricList;
  const available = views.filter(v => v.years.length > 0);
  const [oilId, setOilId] = useState(available[0]?.id ?? views[0].id);
  const oil = views.find(v => v.id === oilId)!;
  const [yearPick, setYearPick] = useState<number | null>(null);
  const year = yearPick && oil.years.includes(yearPick) ? yearPick : oil.years[oil.years.length - 1];
  // В таблице по Евразии не показываем столбцы, где у всех стран пусто или ноль
  // (например, производство пальмового масла в ЕС, Турции, России и Украине).
  const focusRows = oil.focus[year] ?? [];
  const focusMetrics = METRICS.filter(m => focusRows.some(c => (c.values[m.id] ?? 0) !== 0));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs label={t.oil} options={views.map(v => ({ id: v.id, label: v.label }))} value={oilId} onChange={setOilId} />
        {oil.years.length > 0 && (
          <Tabs label={t.season} options={oil.years.map(y => ({ id: y, label: myLabel(y) }))} value={year} onChange={setYearPick} />
        )}
      </div>

      {oil.years.length === 0 ? (
        <p className="text-ink-2">{t.noOil}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left text-sm text-ink-2 pb-2">{t.world}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{t.indicator}</th>
                  {oil.years.map(y => (
                    <th key={y} scope="col" className={`py-2 px-3 text-right font-normal ${y === year ? 'text-ink' : ''}`}>{myLabel(y)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {METRICS.map(m => (
                  <tr key={m.id}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{m.label}</th>
                    {oil.years.map(y => (
                      <td key={y} className={`py-2 px-3 text-right num ${y === year ? 'font-medium text-ink bg-gold-soft/50' : 'text-ink-2'}`}>
                        {fmtInt(oil.world[m.id][y], lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            {TOP.map(id => {
              const list = oil.top[year]?.[id] ?? [];
              const max = list[0]?.value || 1;
              return (
                <div key={id}>
                  <h3 className="font-cond text-lg font-semibold mb-2">{t.top[id as keyof PsdLabels['top']]} <span className="text-sm font-normal text-ink-3">{myLabel(year)}</span></h3>
                  {list.length === 0 ? <p className="text-sm text-ink-3">{t.noData}</p> : (
                    <ol className="text-sm">
                      {list.map(r => (
                        <li key={r.name} className="grid grid-cols-[1fr_auto_3rem] gap-x-2 items-baseline py-1">
                          <span className="relative min-w-0">
                            <span aria-hidden="true" className="absolute inset-y-0 left-0 -z-0 bg-gold-soft rounded-[1px]" style={{ width: `${(r.value / max) * 100}%` }} />
                            <span className="relative px-1 truncate block">{r.name}</span>
                          </span>
                          <span className="num text-right">{fmtInt(r.value, lang)}</span>
                          <span className="num text-right text-xs text-ink-3">{r.share != null ? `${r.share.toFixed(0)}%` : ''}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>

          {focusRows.length > 0 && focusMetrics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="text-left text-sm text-ink-2 pb-2">{t.focus.replace('{year}', myLabel(year))}</caption>
                <thead>
                  <tr className="text-xs text-ink-3 border-b border-rule">
                    <th scope="col" className="py-2 pr-4 text-left font-normal">{t.country}</th>
                    {focusMetrics.map(m => <th key={m.id} scope="col" className="py-2 px-3 text-right font-normal">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {focusRows.map(c => (
                    <tr key={c.name}>
                      <th scope="row" className="py-2 pr-4 text-left font-normal">{c.name}</th>
                      {focusMetrics.map(m => <td key={m.id} className="py-2 px-3 text-right num">{fmtInt(c.values[m.id], lang)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
