// app/market/page.tsx
import Layout from '@/components/Layout';
import MarketPriceBoard from '@/components/MarketPriceBoard';

export default function MarketPage() {
  return (
    <Layout title="Market Data & Live Prices">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Live Market Prices</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          CPO • Soybean • Sunflower • Rapeseed | Real-time quotes & spreads
        </p>
      </div>
      <MarketPriceBoard />
    </Layout>
  );
}
