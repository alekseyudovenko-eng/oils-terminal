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

 
