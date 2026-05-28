import { supabaseClient } from '@/lib/supabase';
import AddPriceButton from '@/components/AddPriceButton';
export default async function Home() {
  const { data: prices } = await supabaseClient
    .from('market_data')
    .select('*')
    .order('verified_at', { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🛢️ Oils & Fats Terminal</h1>
          <p className="text-slate-500">Online Trading Interface</p>
        </div>
        <AddPriceButton />
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">📊 Котировки</h2>
        {!prices || prices.length === 0 ? (
          <p className="text-gray-500">Нет данных.</p>
        ) : (
          prices.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg mb-2 border">
              <div>
                <p className="font-bold text-slate-800">{item.commodity}</p>
                <p className="text-xs text-gray-500">Status: {item.status}</p>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-900">${item.value}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
