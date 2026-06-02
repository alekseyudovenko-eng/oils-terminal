"use client";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase на клиенте
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BalanceData {
  country: string;
  commodity: string;
  production: number | null;
  exports: number | null;
  imports: number | null;
  consumption: number | null;
}

const TABS = [
  { key: "all", label: "All Data" },
  { key: "Soybean Oil", label: "Soybean Oil" },
  { key: "Palm Oil", label: "Palm Oil" },
  { key: "Rapeseed Oil", label: "Rapeseed Oil" },
  { key: "Sunflower Oil", label: "Sunflower Oil" },
];

export default function OilBalanceTable() {
  const [activeTab, setActiveTab] = useState("all");
  const [data, setData] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let query = supabase.from('usda_balance_data').select('*');
      
      if (activeTab !== 'all') {
        query = query.eq('commodity', activeTab);
      }
      
      const { data: result, error } = await query.order('country', { ascending: true });
      
      if (!error && result) {
        setData(result as BalanceData[]);
      }
      setLoading(false);
    }
    
    fetchData();
  }, [activeTab]);

  if (loading) return <div className="p-4 text-center text-slate-500">Loading USDA Data...</div>;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-sm font-medium rounded-sm transition ${
              activeTab === tab.key 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-3 font-semibold text-slate-700">Country</th>
            <th className="p-3 font-semibold text-slate-700 text-right">Production</th>
            <th className="p-3 font-semibold text-slate-700 text-right">Exports</th>
            <th className="p-3 font-semibold text-slate-700 text-right">Imports</th>
            <th className="p-3 font-semibold text-slate-700 text-right">Consumption</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4 text-center text-slate-500">No data available for this period.</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">{row.country}</td>
                <td className="p-3 text-right text-slate-700">{row.production?.toLocaleString() || '-'}</td>
                <td className="p-3 text-right text-slate-700">{row.exports?.toLocaleString() || '-'}</td>
                <td className="p-3 text-right text-slate-700">{row.imports?.toLocaleString() || '-'}</td>
                <td className="p-3 text-right text-slate-700">{row.consumption?.toLocaleString() || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2 italic">Source: USDA FAS PSD Database (Updated Monthly)</p>
    </div>
  );
}
