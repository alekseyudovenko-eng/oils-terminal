import { supabaseClient } from '@/lib/supabase';
import AddPriceButton from '@/components/AddPriceButton';
import Layout from '@/components/Layout';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: prices } = await supabaseClient
    .from('market_data')
    .select('*')
    .order('verified_at', { ascending: false });

  const latestPrices = prices?.reduce((acc: any, current: any) => {
    const existing = acc.find((item: any) => item.commodity === current.commodity);
    if (!existing) acc.push(current);
    return acc;
  }, []) || [];

  return (
    <Layout title="Live Market Data">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Market Quotes</h1>
          <p className="text-slate-500 mt-1">Real-time vegetable oil prices (USD/MT)</p>
        </div>
        <AddPriceButton />
      </div>

      <div className="border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Commodity</th>
              <th className="px-6 py-4 font-medium text-right">Price</th>
              <th className="px-6 py-4 font-medium text-right">Unit</th>
              <th className="px-6 py-4 font-medium">Source</th>
              <th className="px-6 py-4 font-medium text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {latestPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  No data available. Please update.
                </td>
              </tr>
            ) : (
              latestPrices.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.commodity}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">${item.value.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{item.unit || 'USD/MT'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs uppercase">{item.sources?.[0]?.source || 'N/A'}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs">
                    {new Date(item.verified_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
