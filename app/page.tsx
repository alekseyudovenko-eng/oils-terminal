import { supabaseClient } from '@/lib/supabase';
import AddPriceButton from '@/components/AddPriceButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Получаем все данные из базы
  const { data: prices } = await supabaseClient
    .from('market_data')
    .select('*')
    .order('verified_at', { ascending: false });

  // Фильтруем дубликаты, оставляя только самую свежую запись для каждого масла
  const latestPrices = prices?.reduce((acc: any, current: any) => {
    const existing = acc.find((item: any) => item.commodity === current.commodity);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []) || [];

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🛢️ Oils & Fats Terminal</h1>
          <p className="text-slate-500">Global Market Prices (Real-time)</p>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/balance" className="text-blue-600 hover:underline font-medium">
            📈 Аналитика баланса
          </Link>
          <AddPriceButton />
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">📊 Котировки основных масел</h2>
        
        {latestPrices.length === 0 ? (
          <p className="text-gray-500">Нет данных. Нажми "Обновить цену" для загрузки.</p>
        ) : (
          <div className="grid gap-4">
            {latestPrices.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition">
                <div>
                  <p className="font-bold text-slate-800 text-lg">{item.commodity}</p>
                  <p className="text-xs text-gray-500">
                    Source: {item.sources?.[0]?.source || 'N/A'} | {new Date(item.verified_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-slate-900">${item.value}</p>
                  <p className="text-xs text-gray-400">per Metric Ton</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
