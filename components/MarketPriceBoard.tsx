// components/MarketPriceBoard.tsx
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Currency = 'USD' | 'EUR' | 'MYR';
type Period = '7d' | '30d' | '90d';

interface PriceItem {
  symbol: string;
  price: number;
  currency: string;
  unit: string;
  change_val: number;
  change_pct: number;
  convertedPrice: number;
  convertedChange: number;
  source: string;
  timestamp: string;
}

export default function MarketPriceBoard() {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [period, setPeriod] = useState<Period>('30d');
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-data?currency=${currency}&period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      setPrices(json.prices || []);
      
      // Группировка истории по дате для графика
      const grouped = (json.history || []).reduce((acc: Record<string, any>, item: any) => {
        if (!acc[item.date]) acc[item.date] = { date: item.date };
        acc[item.date][item.symbol.toLowerCase()] = item.convertedPrice;
        return acc;
      }, {});
      setHistory(Object.values(grouped));
      setLastUpdate(new Date().toLocaleTimeString('ru-RU'));
    } catch (e) {
      console.error('❌ Failed to load market data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Автообновление каждые 30 секунд
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [currency, period]);

  if (loading && prices.length === 0) {
    return <div className="p-8 text-center text-slate-500">⏳ Загрузка рыночных данных...</div>;
  }

  const unitLabel = currency === 'USD' ? 'USD/MT' : currency === 'EUR' ? 'EUR/MT' : 'MYR/MT';

  return (
    <div className="space-y-6">
      {/* 🎛 Панель управления */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200">
        <div className="flex gap-3">
          {(['USD', 'EUR', 'MYR'] as Currency[]).map(c => (
            <button 
              key={c} 
              onClick={() => setCurrency(c)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                currency === c 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center text-sm text-slate-500 dark:text-slate-400">
          <span>📅 Период:</span>
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded text-xs ${
                period === p 
                  ? 'bg-slate-200 dark:bg-slate-600 font-semibold' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
          <span className="ml-4 text-xs">🔄 {lastUpdate}</span>
        </div>
      </div>

      {/* 💳 Карточки цен */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {prices.map((p: PriceItem) => (
          <div 
            key={p.symbol} 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{p.symbol}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                p.change_pct >= 0 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {p.change_pct >= 0 ? '▲' : '▼'} {Math.abs(p.change_pct).toFixed(2)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {p.convertedPrice.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {unitLabel} • {p.source}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔗 Спреды */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">🔗 Межтоварные спреды ({unitLabel})</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {prices.length >= 2 && (
            <>
              <SpreadCard a={prices.find(p => p.symbol === 'CPO')} b={prices.find(p => p.symbol === 'SOY')} label="CPO − Soy" />
              <SpreadCard a={prices.find(p => p.symbol === 'CPO')} b={prices.find(p => p.symbol === 'SUN')} label="CPO − Sun" />
              <SpreadCard a={prices.find(p => p.symbol === 'SOY')} b={prices.find(p => p.symbol === 'SUN')} label="Soy − Sun" />
              <SpreadCard a={prices.find(p => p.symbol === 'CPO')} b={prices.find(p => p.symbol === 'RAPI')} label="CPO − RAPI" />
            </>
          )}
        </div>
      </div>

      {/* 📊 График */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 h-80">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">📈 История цен ({period})</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" domain={['auto', 'auto']} tickFormatter={(v) => `${v}`} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px',
                fontSize: '12px'
              }} 
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="cpo" stroke="#f59e0b" strokeWidth={2} name="CPO" dot={false} />
            <Line type="monotone" dataKey="soy" stroke="#22c55e" strokeWidth={2} name="Soybean" dot={false} />
            <Line type="monotone" dataKey="sun" stroke="#eab308" strokeWidth={2} name="Sunflower" dot={false} />
            <Line type="monotone" dataKey="rapi" stroke="#8b5cf6" strokeWidth={2} name="Rapeseed" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Вспомогательный компонент для спреда
function SpreadCard({ a, b, label }: { a?: PriceItem; b?: PriceItem; label: string }) {
  if (!a || !b) return null;
  const spread = a.convertedPrice - b.convertedPrice;
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-2 text-center border border-slate-200 dark:border-slate-600">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-mono font-bold ${spread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {spread > 0 ? '+' : ''}{spread.toFixed(2)}
      </div>
    </div>
  );
}
