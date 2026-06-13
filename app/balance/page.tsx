import OilBalanceTable from '@/components/OilBalanceTable';

export default function BalancePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Balance Sheet</h1>
      <OilBalanceTable />
    </div>
  );
}

import Layout from '@/components/Layout';

export default function BalancePage() {
  return (
    <Layout title="Market Balance Sheet">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Regional Balance</h1>
        <p className="text-slate-500 mt-1">Production, Import, Export, and Consumption metrics (USDA Data)</p>
      </div>
      
      <div className="border border-slate-200 rounded-sm p-1 bg-white">
        <OilBalanceTable />
      </div>
    </Layout>
  );
}
