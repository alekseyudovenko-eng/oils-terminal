import { supabaseClient } from '@/lib/supabase';

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
        <button 
          onClick={async () => {
            await fetch('/api/add-price', { method: 'POST' });
            window.location.reload();
          }} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          ➕ Добавить тестовую цену
        </button>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">📊 Котировки</h2>
        {!prices || prices.length === 0 ? (
          <p className="text-gray-500">Нет данных. Нажми кнопку выше.</p>
        ) : (
          prices.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg mb-2 border">
              <div>
                <p className="font-bold">{item.commodity}</p>
                <p className="text-xs text-gray-500">Status: {item.status}</p>
              </div>
              <p className="text-2xl font-mono font-bold">${item.value}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
