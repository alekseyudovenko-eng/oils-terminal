// app/balance/page.tsx
import Layout from '@/components/Layout';
import OilBalanceTable from '@/components/OilBalanceTable';

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
