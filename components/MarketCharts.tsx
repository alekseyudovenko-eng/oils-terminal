'use client';
// Интерактивный график на странице «Рынок»: переключение инструмента и периода без перехода на другую страницу.
import { useState } from 'react';
import PriceChart, { type ChartPoint } from './PriceChart';

export type ChartSeries = { id: string; name: string; unit: string; points: ChartPoint[] };

export default function MarketCharts({
  series, locale, labels,
}: { series: ChartSeries[]; locale: string; labels: React.ComponentProps<typeof PriceChart>['labels'] }) {
  const [id, setId] = useState(series[0]?.id);
  const cur = series.find(s => s.id === id) ?? series[0];
  if (!cur) return null;
  return (
    <div>
      <div role="tablist" className="mb-3 flex flex-wrap gap-2 text-sm">
        {series.map(s => (
          <button key={s.id} role="tab" aria-selected={s.id === cur.id} onClick={() => setId(s.id)}
            className={`rounded border px-3 py-1.5 ${s.id === cur.id ? 'border-ink bg-ink text-paper' : 'border-rule bg-panel text-ink-2 hover:border-gold'}`}>
            {s.name}
          </button>
        ))}
      </div>
      <PriceChart key={cur.id} points={cur.points} unit={cur.unit} locale={locale} labels={labels} initial="6m" height={340} />
    </div>
  );
}
