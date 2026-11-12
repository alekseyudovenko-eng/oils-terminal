'use client';
// components/PriceChart.tsx — график дневных цен закрытия (TradingView Lightweight Charts, Apache-2.0).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';

export type ChartPoint = { d: string; c: number };
type RangeId = '1m' | '3m' | '6m' | '1y' | '5y' | 'max';
const RANGES: { id: RangeId; days: number }[] = [
  { id: '1m', days: 31 }, { id: '3m', days: 92 }, { id: '6m', days: 183 }, { id: '1y', days: 366 }, { id: '5y', days: 1827 }, { id: 'max', days: 100000 },
];

export default function PriceChart({
  points, unit, locale, labels, initial = '1y', height = 320,
}: {
  points: ChartPoint[];
  unit: string;
  locale: string;
  labels: Record<RangeId, string> & { change: string; empty: string };
  initial?: RangeId;
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Area'> | null>(null);
  const [range, setRange] = useState<RangeId>(initial);

  const data = useMemo(
    () => points.map(p => ({ time: (Date.parse(p.d + 'T00:00:00Z') / 1000) as UTCTimestamp, value: p.c })),
    [points],
  );

  useEffect(() => {
    if (!box.current || data.length < 2) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const c = createChart(box.current, {
      height,
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: v('--ink-2', '#4a5a53'), fontFamily: 'inherit', fontSize: 12 },
      grid: { vertLines: { visible: false }, horzLines: { color: v('--rule', '#d9dfd6') } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { horzLine: { labelBackgroundColor: v('--ink', '#17241f') }, vertLine: { labelBackgroundColor: v('--ink', '#17241f') } },
      localization: { locale, priceFormatter: (x: number) => x.toLocaleString(locale, { maximumFractionDigits: x < 20 ? 4 : x < 1000 ? 2 : 0 }) },
      handleScroll: false,
      handleScale: false,
    });
    const gold = v('--gold', '#a87612');
    const s = c.addAreaSeries({ lineColor: gold, lineWidth: 2, topColor: gold + '40', bottomColor: gold + '05', priceLineVisible: false });
    s.setData(data);
    chart.current = c; series.current = s;
    return () => { c.remove(); chart.current = null; series.current = null; };
  }, [data, height, locale]);

  useEffect(() => {
    const c = chart.current;
    if (!c || data.length < 2) return;
    const days = RANGES.find(r => r.id === range)!.days;
    const last = data[data.length - 1].time;
    const from = Math.max(data[0].time, last - days * 86400) as UTCTimestamp;
    c.timeScale().setVisibleRange({ from, to: last });
  }, [range, data]);

  const stats = useMemo(() => {
    if (data.length < 2) return null;
    const days = RANGES.find(r => r.id === range)!.days;
    const last = data[data.length - 1];
    const fromT = last.time - days * 86400;
    const first = data.find(p => p.time >= fromT) ?? data[0];
    return { pct: ((last.value - first.value) / first.value) * 100, firstDay: new Date(first.time * 1000) };
  }, [data, range]);

  if (data.length < 2) return <p className="text-sm text-ink-2">{labels.empty}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div role="tablist" className="inline-flex rounded border border-rule bg-panel p-0.5 text-sm">
          {RANGES.map(r => (
            <button key={r.id} role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)}
              className={`px-2.5 py-1 rounded ${range === r.id ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>
              {labels[r.id]}
            </button>
          ))}
        </div>
        {stats && (
          <p className="text-sm text-ink-2">
            {labels.change}{' '}
            <span className={stats.pct >= 0 ? 'text-up font-medium' : 'text-down font-medium'}>
              {stats.pct >= 0 ? '+' : '−'}{Math.abs(stats.pct).toLocaleString(locale, { maximumFractionDigits: 1 })}%
            </span>
            <span className="text-ink-3"> · {unit}</span>
          </p>
        )}
      </div>
      <div ref={box} style={{ height }} className="w-full" />
    </div>
  );
}
