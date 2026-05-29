import OilBalanceTable from '@/components/OilBalanceTable';
import Link from 'next/link';

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HERO SECTION --- */}
      <section className="bg-slate-900 text-white py-16 px-6 md:px-12 border-b border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold tracking-wide uppercase text-sm">
            <span>📅 May 8 – May 18, 2026</span>
            <span>•</span>
            <span>Client: MPOC</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Analytical Report: Vegetable Oils & Fats Market
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mb-8 leading-relaxed">
            Comprehensive analysis of Europe, Central Asia, and Caucasus markets. 
            Focus on Palm Oil competitiveness, regulatory shifts (EUDR/RED III), and logistics corridors.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/balance" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-lg">
              📊 Open Interactive Balance Table
            </Link>
            <Link href="/" className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition">
              ← Back to Terminal
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 space-y-16">

        {/* --- EXECUTIVE SUMMARY --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">I</span>
            Executive Summary
          </h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700">🌴 Palm Oil Advantage</h3>
              <p className="text-sm text-slate-600">
                Maintains price advantage over rapeseed and sunflower oil. POGO spread remains positive ($100–200/ton discount to gasoil), supporting biodiesel demand in EU despite RED III pressure.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700">🚢 Logistics Shift</h3>
              <p className="text-sm text-slate-600">
                Middle Corridor (TITR) becomes preferred route for specialty fats from Malaysia to Central Europe, reducing transit time to <strong>15–19 days</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700">⚖️ Regulatory Ease</h3>
              <p className="text-sm text-slate-600">
                EUDR simplification confirmed: compliance costs reduced by <strong>75%</strong>. B2B buyers exempt from DDS submission, easing internal EU trade.
              </p>
            </div>
          </div>
        </section>

        {/* --- REGULATORY OUTLOOK --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">II</span>
            Regulatory Outlook: EUDR & RED III
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* EUDR Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">EU Deforestation Regulation (EUDR)</h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Simplification Phase</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-emerald-500">✔</span>
                  <span><strong>75% Cost Reduction:</strong> Compliance costs drop from €8.1bn to €2bn annually.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✔</span>
                  <span><strong>First Importer Only:</strong> Only the first importer submits Due Diligence Statement (DDS).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✔</span>
                  <span><strong>B2B Exemption:</strong> Processors and retailers exempt from DDS if sourced from registered operators.</span>
                </li>
              </ul>
            </div>

            {/* RED III Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">Renewable Energy Directive III (RED III)</h3>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">National Transposition</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span><strong>POME Phase-out:</strong> Palm Oil Methyl Ester gradually excluded from RED III targets due to ILUC criteria.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span><strong>POGO Spread:</strong> Palm oil trades at $100–200/ton discount to gasoil, keeping it viable for blending where national quotas allow.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span><strong>Market Shift:</strong> Expect pressure on bio-energy demand in Germany/France, redirecting volumes to food/oleochemical sectors.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* --- REGIONAL UPDATES --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm">III</span>
            Regional Market Updates
          </h2>
          
          <div className="space-y-8">
            {/* Serbia */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                🇷🇸 Serbia: Regulatory Shock & &quot;Yellow Triangle&quot;
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Since May 1, 2026, all dairy analogues and pastries with palm fat must carry a <strong>yellow triangle label</strong>: &quot;Not a 100% dairy product – contains palm oil&quot;.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
                <p><strong>Law on Trading Practices:</strong> Written contracts mandatory for all rebates/prices.</p>
                <p><strong>Digital Transparency:</strong> &quot;e-otkupno mesto&quot; system requires digital registration of all agri-purchases.</p>
                <p className="text-emerald-700 font-medium mt-2">Strategy: Position MSPO-certified oil as a sustainable alternative to local drought-affected oils.</p>
              </div>
            </div>

            {/* Poland & Bulgaria Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-3">🇵🇱 Poland: Production Crisis</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Hydrological drought declared in Wielkopolskie and Lubuskie. Rapeseed yield potential dropped to <strong>1–1.5 t/ha</strong>.
                </p>
                <p className="text-sm text-slate-600">
                  PSPO estimates a <strong>500,000 ton deficit</strong> for 2026/27. Opportunity for palm oil in industrial confectionery fats.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-3">🇧🇬 Bulgaria: Logistics Hub</h3>
                <p className="text-sm text-slate-600 mb-2">
                  New berth at <strong>Port Varna (Odessos PBM)</strong> operational. Depth -12.78m allows direct discharge of large SE Asian tankers.
                </p>
                <p className="text-sm text-slate-600">
                  Bulgaria now offers lowest CIF prices in EU due to Black Sea proximity and new logistics efficiency.
                </p>
              </div>
            </div>

            {/* Central Asia */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                🇰🇿 🇺🇿 Central Asia: Industrial Gap & New Routes
              </h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-600">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Uzbekistan</h4>
                  <p>National crushing capacity utilization is only <strong>37%</strong> due to seed shortages. Refined sunflower oil imports from Kazakhstan jumped 41% y/y.</p>
                  <p className="mt-2 text-emerald-700 font-medium">Opportunity: Supply CPO as feedstock for local refineries.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Kazakhstan</h4>
                  <p>Launched <strong>Caspian Route to Iran</strong> via Aktau port (150-200k tons/year capacity). Record sunflower stocks of 2.11 million tons (+38% y/y).</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- LOGISTICS & PRICES --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">IV</span>
            Logistics & Price Analysis
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Logistics Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <h3 className="font-bold text-slate-800 mb-4">Corridor Comparison (May 2026)</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Parameter</th>
                    <th className="px-4 py-3 text-emerald-600">TITR (Middle)</th>
                    <th className="px-4 py-3 text-slate-600">Black Sea</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Transit Time</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">15–19 Days</td>
                    <td className="px-4 py-3">37–45 Days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Freight Rate</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">$3,500 – $4,500</td>
                    <td className="px-4 py-3">$10,000</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Risk</td>
                    <td className="px-4 py-3 text-emerald-700">Standard</td>
                    <td className="px-4 py-3 text-red-600">High (War Risk)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Price Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <h3 className="font-bold text-slate-800 mb-4">Comparative Prices (USD/MT)</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Palm Oil (FCPO)</td>
                    <td className="px-4 py-3 text-right font-mono">$985 – $1,010</td>
                    <td className="px-4 py-3 text-right text-emerald-600">+$15</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Soybean Oil (CBOT)</td>
                    <td className="px-4 py-3 text-right font-mono">$1,715</td>
                    <td className="px-4 py-3 text-right text-emerald-600">+$20</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Rapeseed Oil (Euronext)</td>
                    <td className="px-4 py-3 text-right font-mono">$1,250 – $1,280</td>
                    <td className="px-4 py-3 text-right text-red-500">-$10</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Sunflower Oil (FOB BS)</td>
                    <td className="px-4 py-3 text-right font-mono">$1,150 – $1,180</td>
                    <td className="px-4 py-3 text-right text-emerald-600">+$25</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* --- DEEP DIVE TABLE --- */}
        <section className="border-t border-slate-200 pt-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">V. Deep Dive: Market Balance Data</h2>
            <p className="text-slate-600">Detailed production, import, export, and consumption metrics by region.</p>
          </div>
          
          {/* Integration of your existing component */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 md:p-6">
            <OilBalanceTable />
          </div>
        </section>

        {/* --- STRATEGIC RECOMMENDATIONS --- */}
        <section className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-emerald-400">VI. Strategic Recommendations for MPOC</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-bold text-lg">Counter-Labeling in Serbia</h4>
                  <p className="text-slate-400 text-sm mt-1">Turn the &quot;yellow triangle&quot; into a quality benchmark. Promote MSPO-certified oil as sustainable vs. local drought-affected oils.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-bold text-lg">Industrial Feedstock for Uzbekistan</h4>
                  <p className="text-slate-400 text-sm mt-1">Target 63% idle crushing capacity. Position Malaysian CPO as primary feedstock for local refineries.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-bold text-lg">Middle Corridor Adoption</h4>
                  <p className="text-slate-400 text-sm mt-1">Shift high-value specialty fats to TITR. Utilize 15-day transit to bypass $10k ocean freight and Black Sea risks.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <div>
                  <h4 className="font-bold text-lg">Stock Positioning</h4>
                  <p className="text-slate-400 text-sm mt-1">Expedite proposal for regional distribution warehouse in Tashkent before 2027 duty review.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
      
      {/* Footer */}
      <footer className="bg-slate-100 py-8 text-center text-slate-500 text-sm border-t border-slate-200 mt-12">
        <p>© 2026 International Marketing Agency Ltd. Exclusive partner of Malaysian Palm Oil Council.</p>
        <p className="mt-1">Data sources: USDA FAS, Eurostat, National Statistical Committees, Industry Reports.</p>
      </footer>
    </main>
  );
}
