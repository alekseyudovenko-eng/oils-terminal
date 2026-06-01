import { supabaseClient } from '@/lib/supabase';
import AddPriceButton from '@/components/AddPriceButton';
import Link from 'next/link';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

// Компонент графика TradingView
function TradingViewWidget() {
  return (
    <div className="w-full h-[500px] bg-white border border-slate-200 rounded-sm overflow-hidden mb-8 relative">
      <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }}>
        <div id="tradingview_chart" style={{ height: "100%", width: "100%" }}></div>
        <Script
          id="tradingview-widget"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.async = true;
                script.src = "https://s3.tradingview.com/tv.js";
                script.onload = function() {
                  new TradingView.widget({
                    "autosize": true,
                    "symbol": "NCDEX:CPONSEP26", // Ближайший контракт CPO на NCDEX
                    "interval": "D",
                    "timezone": "Asia/Kolkata", // Время Индии для NCDEX
                    "theme": "light",
                    "style": "1",
                    "locale": "en",
                    "toolbar_bg": "#f1f3f6",
                    "enable_publishing": false,
                    "allow_symbol_change": true, // Позволяет пользователю сменить контракт
                    "container_id": "tradingview_chart",
                    "hide_side_toolbar": false,
                    "details": true,
                    "hotlist": true,
                    "calendar": true,
                    "studies": [
                      "MASimple@tv-basicstudies",
                      "RSI@tv-basicstudies"
                    ]
                  });
                };
                document.head.appendChild(script);
              })();
            `
          }}
        />
      </div>
    </div>
  );
}

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

  // Сортируем цены в требуемом порядке
  const desiredOrder = [
    'Rapeseed Oil FOB Rotterdam',
    'Soybean Oil CBOT (Chicago)',
    'RBD Palm Olein FOB Malaysia',
    'CPO Spot (Indonesia)',
    'CPO Spot (Malaysia)',
    'Sunflower Oil (FOB BS)',
    'Olive Oil (Europe)'
  ];

  const sortedPrices = latestPrices.sort((a: any, b: any) => {
    return desiredOrder.indexOf(a.commodity) - desiredOrder.indexOf(b.commodity);
  });

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* --- HEADER --- */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition">
              OILS TERMINAL
            </Link>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
              <Link href="/" className="text-slate-900 font-semibold">Market Data</Link>
              <Link href="/regional-review" className="hover:text-slate-900 transition">Regional Review</Link>
              <Link href="/balance" className="hover:text-slate-900 transition">Balance Sheet</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
             <AddPriceButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* --- CHART SECTION --- */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">CPO Futures (NCDEX Kandla)</h2>
              <p className="text-sm text-slate-500">National Commodity & Derivatives Exchange • Spot/Futures</p>
            </div>
          </div>
          <TradingViewWidget />
        </div>

        {/* --- PRICES TABLE --- */}
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Market Quotes (USD/MT)</h3>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Live Data</span>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Commodity</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Unit</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedPrices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No data available. Please update.
                  </td>
                </tr>
              ) : (
                sortedPrices.map((item: any) => (
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
      </div>
    </main>
  );
}
