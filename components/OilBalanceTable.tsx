'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, ComposedChart
} from 'recharts';

// 🔹 Типы данных (встроены, чтобы не тянуть отдельные файлы)
type Commodity = 'palm' | 'soybean' | 'sunflower' | 'rapeseed' | 'coconut';
type Region = 'global' | 'indonesia' | 'malaysia' | 'eu' | 'ukraine' | 'central_asia' | 'caucasus';
type Metric = 'production' | 'consumption' | 'exports' | 'imports' | 'ending_stocks';

interface SeriesPoint { period: string; value: number; }
interface BalanceSeries { commodity: Commodity; region: Region; metric: Metric; data: SeriesPoint[]; }

export default function OilBalanceTable() {
  const [commodity, setCommodity] = useState<Commodity>('palm');
  const [region, setRegion] = useState<Region>('global');
  const [metric, setMetric] = useState<Metric | 'all'>('all');
  const [series, setSeries] = useState<BalanceSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ commodity, region, periods: '12' });
        if (metric !== 'all') params.append('metric', metric);
        
        const res = await fetch(`/api/usda-balance?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        
        // Преобразуем объект series в массив
        const parsed: BalanceSeries[] = Object.entries(json.series || {}).map(([key, points]: [string, any]) => {
          const [c, r, m] = key.split('|');
          return { commodity: c as Commodity, region: r as Region, metric: m as Metric, data: points };
        });
        setSeries(parsed);
      } catch (e) {
        console.error('❌ Load error:', e);
        setError('Не удалось загрузить данные баланса');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [commodity, region, metric]);

  if (loading) return <div className="p-8 text-center text-gray-500">⏳ Загрузка данных баланса...</div>;
  if (error) return <div className="p-8 text-center text-red-500">⚠️ {error}</div>;

  // 🔹 Таблица: текущие значения + динамика
  const tableRows = series.map(s => {
    const latest = s.data[s.data.length - 1];
    const prev = s.data[s.data.length - 2];
    const change = prev ? ((latest.value - prev.value) / prev.value * 100).toFixed(1) : '0';
    return {
      metric: s.metric,
      current: latest.value,
      previous: prev?.value || 0,
      change: parseFloat(change)
    };
  });

  // 🔹 Данные для сравнительного графика
  const compareData = metric !== 'all' 
    ? prepareComparisonData(series, metric)
    : [];

  return (
    <div className="space-y-6">
      {/* 🎛 Фильтры */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <select value={commodity} onChange={e => setCommodity(e.target.value as Commodity)}
          className="px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="palm">🌴 Palm Oil</option>
          <option value="soybean">🫘 Soybean Oil</option>
          <option value="sunflower">🌻 Sunflower Oil</option>
          <option value="rapeseed">🌼 Rapeseed Oil</option>
          <option value="coconut">🥥 Coconut Oil</option>
        </select>

        <select value={region} onChange={e => setRegion(e.target.value as Region)}
          className="px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="global">🌍 Global</option>
          <option value="indonesia">🇮🇩 Indonesia</option>
          <option value="malaysia">🇲🇾 Malaysia</option>
          <option value="eu">🇪🇺 European Union</option>
          <option value="ukraine">🇺🇦 Ukraine</option>
          <option value="central_asia">🏔 Central Asia</option>
          <option value="caucasus">⛰ Caucasus</option>
        </select>

        <select value={metric} onChange={e => setMetric(e.target.value as Metric | 'all')}
          className="px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option value="all">📊 All Metrics</option>
          <option value="production">🏭 Production</option>
          <option value="consumption">🛒 Consumption</option>
          <option value="exports">📤 Exports</option>
          <option value="imports">📥 Imports</option>
          <option value="ending_stocks">📦 Ending Stocks</option>
        </select>
      </div>

      {/* 📋 Таблица баланса */}
      <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
        <table className="w-full text-sm dark:text-gray-200">
          <thead className="bg-gray-100 dark:bg-gray-700 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-3 text-left">Metric</th>
              <th className="p-3 text-right">Current</th>
              <th className="p-3 text-right">Previous</th>
              <th className="p-3 text-right">Δ %</th>
              <th className="p-3 text-left">Unit</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">Нет данных за выбранные фильтры</td></tr>
            ) : tableRows.map((row, i) => (
              <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="p-3 font-medium capitalize">{row.metric.replace('_', ' ')}</td>
                <td className="p-3 text-right font-mono">{row.current.toLocaleString()}</td>
                <td className="p-3 text-right font-mono text-gray-500">{row.previous.toLocaleString()}</td>
                <td className={`p-3 text-right font-mono ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.change >= 0 ? '+' : ''}{row.change}%
                </td>
                <td className="p-3 text-gray-500">000' MT</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📈 График динамики */}
      {series.length > 0 && series[0].data.length > 1 && (
        <div className="h-80 p-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <h4 className="mb-2 font-medium dark:text-gray-200">12-Month Trend</h4>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series[0].data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(1)}M`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(val: number) => [`${val.toLocaleString()} 000' MT`, 'Value']}
              />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Value" />
              <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 🆚 Сравнение товаров (если выбран конкретный метрик) */}
      {compareData.length > 0 && (
        <div className="h-80 p-2 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <h4 className="mb-2 font-medium dark:text-gray-200">Cross-Commodity: {metric.replace('_', ' ')}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', color: '#fff' }} />
              <Legend />
              {['palm', 'soybean', 'sunflower', 'rapeseed'].map(c => (
                <Line key={c} type="monotone" dataKey={c} stroke={getColor(c)} name={getLabel(c)} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// 🔧 Вспомогательные функции
function prepareComparisonData(series: BalanceSeries[], targetMetric: Metric) {
  const periods = [...new Set(series.flatMap(s => s.data.map(d => d.period)))].sort();
  return periods.map(period => {
    const row: Record<string, any> = { period };
    series.forEach(s => {
      if (s.metric === targetMetric) {
        const pt = s.data.find(d => d.period === period);
        row[s.commodity] = pt?.value ?? null;
      }
    });
    return row;
  });
}

function getColor(c: string) {
  const map: Record<string, string> = { palm: '#f59e0b', soybean: '#22c55e', sunflower: '#eab308', rapeseed: '#8b5cf6' };
  return map[c] || '#6b7280';
}
function getLabel(c: string) {
  const map: Record<string, string> = { palm: 'Palm', soybean: 'Soybean', sunflower: 'Sunflower', rapeseed: 'Rapeseed' };
  return map[c] || c;
}
