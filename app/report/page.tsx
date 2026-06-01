"use client";
import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { ExternalLink, Download, FileText, FileType } from 'lucide-react';

// ... (ВСЕ КОНСТАНТЫ И ДАННЫЕ REPORT_DATA ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ) ...
// Вставь сюда весь блок const SOURCES и const REPORT_DATA из предыдущего кода

const formatDate = (date: Date) => {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const SOURCES = {
  EUDR: { name: "EU Simplification Report (May 4, 2026)", url: "https://www.google.com/search?q=EU+Deforestation+Regulation+Simplification+Report+May+2026" },
  PSPO: { name: "Polish Oil Producers Association (PSPO) Update", url: "https://www.google.com/search?q=PSPO+Poland+rapeseed+drought+May+2026+deficit" },
  SERBIA: { name: "Serbian Law on Trading Practices & Labeling", url: "https://www.google.com/search?q=Serbia+yellow+triangle+palm+oil+labeling+law+2026" },
  VARNA: { name: "Port Varna (Odessos PBM) Operational Update", url: "https://www.google.com/search?q=Port+Varna+Odessos+PBM+new+berth+2026" },
  KAZ: { name: "Ministry of Agriculture of Kazakhstan (May 14, 2026)", url: "https://www.google.com/search?q=Kazakhstan+Ministry+of+Agriculture+Caspian+route+Iran+May+2026" },
  UZB: { name: "APK-Inform / Uzbekistan Market Analysis", url: "https://www.google.com/search?q=APK-Inform+Uzbekistan+vegetable+oil+market+2026" },
  TITR: { name: "TITR Roadmap on Digitalization (April 24, 2026)", url: "https://www.google.com/search?q=TITR+Middle+Corridor+digitalization+roadmap+2026" },
  BLACKSEA: { name: "Maritime Security & Insurance Analytics (BIMCO)", url: "https://www.google.com/search?q=Black+Sea+war+risk+insurance+premiums+May+2026" },
  USDA: { name: "USDA FAS GAIN Reports (EU-27, Bulgaria)", url: "https://www.google.com/search?q=site:fas.usda.gov+EU+Oilseeds+Annual+2026+Bulgaria" },
  EUROSTAT: { name: "Eurostat Agricultural Production Data", url: "https://www.google.com/search?q=site:ec.europa.eu/eurostat+Baltic+port+traffic+2026" }
};

const REPORT_DATA = {
  ru: {
    title: "Аналитический отчет: Рынок растительных масел",
    sections: {
      exec: {
        title: "I. EXECUTIVE SUMMARY (Сводка за 10 дней)",
        points: [
          { text: "Логистика: Средний коридор (TITR) закрепил преимущество с транзитом 15–19 дней.", src: "TITR" },
          { text: "Регуляторика ЕС: Отчет об упрощении EUDR подтвердил снижение затрат на комплаенс на 75%.", src: "EUDR" },
          { text: "Производство: Гидрологическая засуха в Польше снизила потенциал урожайности рапса до 1–1.5 т/га.", src: "PSPO" },
          { text: "Цены: Пальмовое масло торгуется с дисконтом $100–200/тонна к дизтопливу (POGO).", src: "USDA" }
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          { country: "Сербия 🇷🇸", text: "Действует маркировка «Желтый треугольник» для продуктов с пальмовым маслом. Система «e-otkupno mesto» требует цифровой регистрации всех закупок.", src: "SERBIA" },
          { country: "Польша 🇵🇱", text: "Засуха в Великопольском и Любушском воеводствах. PSPO оценивает дефицит рапсового масла в сезоне 2026/27 в 500,000 тонн.", src: "PSPO" },
          { country: "Болгария 🇧🇬", text: "Порт Варна (Odessos PBM) работает на полной мощности нового причала (-12.78м). Прямые поставки из ЮВА без перевалки.", src: "VARNA" },
          { country: "Прибалтика 🇱🇹", text: "Порт Клайпеда контролирует 46% рынка Балтии (374k TEU в Q1).", src: "EUROSTAT" }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          { country: "Казахстан 🇰🇿", text: "Запуск Каспийского маршрута в Иран через порт Актау (150–200 тыс. тонн/год). Рекордные запасы подсолнечника (2.11 млн т).", src: "KAZ" },
          { country: "Узбекистан 🇺🇿", text: "Загрузка НПЗ остается низкой (37%) из-за нехватки сырья. Обсуждается создание хаба MPOC в Ташкенте.", src: "UZB" },
          { country: "Азербайджан 🇦🇿", text: "Реализация меморандума с Грузией о взаимном признании систем безопасности.", src: "USDA" }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: { title: "EUDR (EU Deforestation Regulation)", status: "Simplification Phase (Active)", points: ["Отчет: Затраты на комплаенс снижены с €8.1 млрд до €2 млрд.", "Ответственность только на первом импортере. Переработчики (B2B) освобождены от подачи DDS."], src: "EUDR" },
        rediii: { title: "RED III (Renewable Energy Directive)", status: "National Transposition", points: ["Постепенный вывод POME (пальмового биодизеля) из целей RED III из-за ILUC.", "Высокий спред POGO поддерживает использование пальмового масла в биодизеле."], src: "USDA" }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Transit Time (Asia-EU)", titr: "15–19 Days", bs: "37–45 Days (Cape)", change: "TITR Faster", src: "TITR" },
          { param: "Freight Rate ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "TITR Cheaper", src: "BLACKSEA" },
          { param: "Insurance Premium", titr: "Standard", bs: "1% of Vessel Value", change: "Black Sea Risk", src: "BLACKSEA" }
        ],
        note: "TITR: Сквозная доставка сокращена до 15 дней благодаря цифровизации таможни. Black Sea: Премии за военный риск обновляются каждые 24 часа."
      }
    }
  },
  en: {
    title: "Analytical Report: Vegetable Oils Market",
    sections: {
      exec: {
        title: "I. EXECUTIVE SUMMARY (Last 10 Days)",
        points: [
          { text: "Logistics: Middle Corridor (TITR) solidified advantage with 15–19 day transit.", src: "TITR" },
          { text: "EU Regulation: EUDR Simplification Report confirmed 75% compliance cost reduction.", src: "EUDR" },
          { text: "Production: Hydrological drought in Poland dropped rapeseed yield potential to 1–1.5 t/ha.", src: "PSPO" },
          { text: "Prices: Palm oil trades at $100–200/ton discount to gasoil (POGO).", src: "USDA" }
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          { country: "Serbia 🇷🇸", text: "'Yellow Triangle' labeling for palm-containing products enforced. 'e-otkupno mesto' system requires digital registration.", src: "SERBIA" },
          { country: "Poland 🇵🇱", text: "Drought in Wielkopolskie and Lubuskie. PSPO estimates 500,000 ton rapeseed oil deficit for 2026/27.", src: "PSPO" },
          { country: "Bulgaria 🇧🇬", text: "Port Varna (Odessos PBM) operating new berth (-12.78m) at full capacity. Direct SE Asian deliveries.", src: "VARNA" },
          { country: "The Baltics 🇱🇹", text: "Port of Klaipėda controls 46% of Baltic market (374k TEU in Q1).", src: "EUROSTAT" }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          { country: "Kazakhstan 🇰🇿", text: "Launch of Caspian Route to Iran via Aktau port (150-200k tons/year). Record sunflower stocks (2.11m tons).", src: "KAZ" },
          { country: "Uzbekistan 🇺🇿", text: "Refinery utilization remains low (37%) due to seed shortages. MPOC hub proposal in Tashkent under discussion.", src: "UZB" },
          { country: "Azerbaijan 🇦🇿", text: "Implementation of memorandum with Georgia on food safety equivalence.", src: "USDA" }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: { title: "EUDR (EU Deforestation Regulation)", status: "Simplification Phase (Active)", points: ["Report: Compliance costs reduced from €8.1bn to €2bn.", "Responsibility lies only with the first importer. Processors (B2B) exempt from DDS submission."], src: "EUDR" },
        rediii: { title: "RED III (Renewable Energy Directive)", status: "National Transposition", points: ["Gradual phase-out of POME from RED III targets due to ILUC criteria.", "High POGO spread supports palm oil use in biodiesel where national quotas allow."], src: "USDA" }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Transit Time (Asia-EU)", titr: "15–19 Days", bs: "37–45 Days (Cape)", change: "TITR Faster", src: "TITR" },
          { param: "Freight Rate ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "TITR Cheaper", src: "BLACKSEA" },
          { param: "Insurance Premium", titr: "Standard", bs: "1% of Vessel Value", change: "Black Sea Risk", src: "BLACKSEA" }
        ],
        note: "TITR: End-to-end delivery reduced to 15 days thanks to customs digitalization. Black Sea: War risk premiums updated every 24 hours."
      }
    }
  }
};

function SourceLink({ srcKey }: { srcKey: string }) {
  const source = SOURCES[srcKey as keyof typeof SOURCES];
  if (!source) return null;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center ml-2" title={`Search source: ${source.name}`}>
      <span className="text-[10px] font-mono text-slate-400 border border-slate-200 px-1 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition flex items-center gap-1">
        [Source]
        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </a>
  );
}

export default function ReportPage() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [dateRange, setDateRange] = useState<string>("");
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    setDateRange(`${formatDate(tenDaysAgo)} – ${formatDate(today)}`);
  }, []);

  const t = REPORT_DATA[lang];
  const subtitle = lang === 'ru' 
    ? `Европа, ЦА и Кавказ | ${dateRange} (Последние 10 дней)`
    : `Europe, CA & Caucasus | ${dateRange} (Last 10 Days)`;

  // Функция сохранения в Word (.docx)
  const saveAsWord = () => {
    if (!reportRef.current) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + reportRef.current.innerHTML + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Oils_Report_${new Date().toISOString().split('T')[0]}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    setShowSaveMenu(false);
  };

  // Функция сохранения в PDF (через печать)
  const saveAsPDF = () => {
    window.print();
    setShowSaveMenu(false);
  };

  return (
    <Layout title="Analytical Report">
      <div className="mb-8 flex justify-between items-start print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-sm">
            <button onClick={() => setLang('ru')} className={`px-3 py-1 text-xs font-bold uppercase ${lang === 'ru' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>RU</button>
            <button onClick={() => setLang('en')} className={`px-3 py-1 text-xs font-bold uppercase ${lang === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>EN</button>
          </div>
          
          {/* Кнопка сохранения */}
          <div className="relative">
            <button 
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 text-sm font-medium rounded-sm hover:bg-slate-800 transition"
            >
              <Download size={16} />
              Save Report
            </button>
            
            {showSaveMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden">
                <button onClick={saveAsWord} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Microsoft Word (.doc)
                </button>
                <button onClick={saveAsPDF} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <FileType size={16} className="text-red-600" />
                  Adobe PDF (Print)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Область отчета для сохранения */}
      <div ref={reportRef} className="space-y-12 print:space-y-8 print:p-0">
        
        {/* Executive Summary */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.exec.title}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {t.sections.exec.points.map((point, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border-l-2 border-slate-300 text-sm text-slate-700 leading-relaxed flex justify-between items-start">
                <span>{point.text}</span>
                <span className="print:hidden"><SourceLink srcKey={point.src} /></span>
              </div>
            ))}
          </div>
        </section>

        {/* Regional Analysis */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.europe.title}</h2>
          <div className="grid gap-4">
            {t.sections.europe.items.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 border border-slate-100 hover:border-slate-300 transition">
                <div className="w-24 flex-shrink-0 font-bold text-slate-900 text-sm">{item.country}</div>
                <div className="text-sm text-slate-600 leading-relaxed flex-grow">
                  {item.text}
                  <span className="print:hidden"><SourceLink srcKey={item.src} /></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CIS Overview */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.cis.title}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {t.sections.cis.items.map((item, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.country}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 print:hidden">
                   <SourceLink srcKey={item.src} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.reg.title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-slate-200 rounded-sm">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="font-bold text-slate-900">{t.sections.reg.eudr.title}</h3>
                 <span className="print:hidden"><SourceLink srcKey={t.sections.reg.eudr.src} /></span>
              </div>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase font-bold mb-4">{t.sections.reg.eudr.status}</span>
              <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                {t.sections.reg.eudr.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="p-6 border border-slate-200 rounded-sm">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="font-bold text-slate-900">{t.sections.reg.rediii.title}</h3>
                 <span className="print:hidden"><SourceLink srcKey={t.sections.reg.rediii.src} /></span>
              </div>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase font-bold mb-4">{t.sections.reg.rediii.status}</span>
              <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                {t.sections.reg.rediii.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Logistics Table */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.log.title}</h2>
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3">Parameter</th>
                  <th className="px-4 py-3">TITR (Middle)</th>
                  <th className="px-4 py-3">Black Sea</th>
                  <th className="px-4 py-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {t.sections.log.table.map((row, idx) => (
                  <tr key={idx} className="group">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.param}</td>
                    <td className="px-4 py-3 text-slate-700">{row.titr}</td>
                    <td className="px-4 py-3 text-slate-500">{row.bs}</td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {row.change}
                      <span className="print:hidden"><SourceLink srcKey={row.src} /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
