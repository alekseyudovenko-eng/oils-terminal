import { supabaseClient } from '@/lib/supabase';
import AddPriceButton from '@/components/AddPriceButton';
import Link from 'next/link'; // <--- ВАЖНО: Добавлен импорт

// Запрещаем кэширование, чтобы всегда видеть свежие данные
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Убрали .limit(5), чтобы видеть все записи
  const { data: prices } = await supabaseClient
    .from('market_data')
    .select('*')
    .order('verified_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🛢️ Oils & Fats Terminal</h1>
          <p className="text-slate-500">Online Trading Interface</p>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/balance" className="text-blue-600 hover:underline font-medium">
            📈 Аналитика баланса
          </Link>
          <AddPriceButton />
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">📊 Котировки</h2>
        {!prices || prices.length === 0 ? (
          <p className="text-gray-500">Нет данных. Нажми кнопку выше.</p>
        ) : (
          prices.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg mb-2 border hover:bg-slate-100 transition">
              <div>
                <p className="font-bold text-slate-800">{item.commodity}</p>
                <p className="text-xs text-gray-500">Status: {item.status} | ID: {item.id}</p>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-900">${item.value}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
