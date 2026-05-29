import OilBalanceTable from '@/components/OilBalanceTable';

export default function BalancePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">📊 Баланс масличных культур</h1>
        <p className="text-slate-600 mb-8">
          Анализ производства, импорта, экспорта и потребления растительных масел по регионам.
        </p>
        
        {/* Здесь рендерится твоя таблица */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <OilBalanceTable />
        </div>
      </div>
    </main>
  );
}
