"use client";
import { useState } from 'react';
import Link from 'next/link';

// Данные отчета (можно вынести в отдельный файл, но для простоты оставим здесь)
const REPORT_DATA = {
  ru: {
    title: "Аналитический отчет: Рынок растительных масел и жиров",
    subtitle: "Европа, Центральная Азия и Кавказ | 8–18 мая 2026",
    client: "Для: Malaysian Palm Oil Council (MPOC)",
    sections: {
      exec: {
        title: "I. EXECUTIVE SUMMARY (Ключевые выводы)",
        points: [
          "Рынок демонстрирует высокую волатильность из-за логистических сбоев в Черном море и изменений в регуляторике ЕС.",
          "Пальмовое масло сохраняет ценовое преимущество: спред POGO положительный ($100–200/тонна дисконта к дизтопливу), что поддерживает спрос на биодизель в ЕС.",
          "Логистика: Средний коридор (TITR) сократил транзит до 15–19 дней, став предпочтительным маршрутом для спецжиров из Малайзии.",
          "EUDR: Подтверждено снижение затрат на комплаенс на 75%. Освобождение B2B-покупателей от подачи DDS упрощает внутреннюю торговлю."
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          {
            country: "Сербия 🇷🇸",
            date: "1 мая 2026",
            text: "Вступили в силу правила маркировки: продукты с пальмовым маслом обязаны иметь «желтый треугольник» с предупреждением. Принят закон о торговых практиках, требующий цифровую регистрацию всех закупок («e-otkupno mesto»)."
          },
          {
            country: "Польша 🇵🇱",
            date: "4 мая 2026",
            text: "Объявлена гидрологическая засуха. Потенциал урожайности рапса упал до 1–1.5 т/га. Ожидается дефицит рапсового масла в объеме 500,000 тонн, что открывает окно для импорта пальмового масла в кондитерский сектор."
          },
          {
            country: "Болгария 🇧🇬",
            date: "Середина мая 2026",
            text: "Запуск нового причала в порту Варна (глубина -12.78м) позволяет принимать крупные танкеры из ЮВА напрямую. Болгария предлагает самые низкие цены CIF в ЕС."
          },
          {
            country: "Чехия 🇨🇿",
            date: "Май 2026",
            text: "Новые декреты о майонезе (>70% жира) и обязательное раздельное размещение растительных и животных жиров в ритейле."
          },
          {
            country: "Прибалтика 🇱🇹🇱🇻🇪🇪",
            date: "Q1 2026",
            text: "Порт Клайпеда обработал 374,000 TEU (+38% г/г), контролируя 46% рынка Балтии. Стратегия выпуска аварийных резервов для стабилизации цен."
          }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          {
            country: "Узбекистан 🇺🇿",
            text: "Кризис утилизации мощностей: загрузка НПЗ всего 37% из-за нехватки сырья. Импорт подсолнечного масла из Казахстана вырос на 41%. Предложение посла о создании хаба в Ташкенте до 2027 года."
          },
          {
            country: "Казахстан 🇰🇿",
            date: "14 мая 2026",
            text: "Запуск Каспийского маршрута в Иран через порт Актау (150–200 тыс. тонн/год). Рекордные запасы подсолнечника (2.11 млн тонн)."
          },
          {
            country: "Азербайджан 🇦🇿 и Грузия 🇬🇪",
            date: "7 мая 2026",
            text: "Подписан меморандум о взаимном признании систем пищевой безопасности, что упрощает торговлю спецжирами."
          }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: {
          title: "EUDR (EU Deforestation Regulation)",
          status: "Фаза упрощения (Simplification Phase)",
          points: [
            "Отчет от 4 мая 2026: снижение затрат на комплаенс на 75% (с €8.1 млрд до €2 млрд).",
            "Ответственность только на первом импортере (подача DDS).",
            "B2B-покупатели (производители маргарина, кондитерских изделий) освобождены от подачи собственных заявлений."
          ]
        },
        rediii: {
          title: "RED III (Renewable Energy Directive)",
          status: "Национальное транспонирование",
          points: [
            "Постепенный вывод пальмового масла (POME) из целей RED III из-за критериев ILUC.",
            "Спред POGO остается положительным, поддерживая рентабельность биодизеля там, где позволяют национальные квоты.",
            "Ожидается перенаправление объемов из биоэнергетики в пищевой сектор и олеохимию."
          ]
        }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Время транзита (Азия-ЕС)", titr: "15–19 дней", bs: "37–45 дней (через Мыс)", change: "+9.9% (ускорение)" },
          { param: "Фрахт ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "Снижение" },
          { param: "Страховка", titr: "Стандарт", bs: "1% от стоимости судна", change: "+2.2%" },
          { param: "Риски", titr: "Цифровизация таможни", bs: "Атаки дронов (Высокий риск)", change: "+4.5%" }
        ],
        note: "TITR: Сквозная доставка сокращена с 53 дней (2022) до 15 дней (2026). Черное море: Премии за военный риск обновляются каждые 24 часа."
      }
    }
  },
  en: {
    title: "Analytical Report: Vegetable Oils & Fats Market",
    subtitle: "Europe, Central Asia & Caucasus | May 8–18, 2026",
    client: "For: Malaysian Palm Oil Council (MPOC)",
    sections: {
      exec: {
        title: "I. EXECUTIVE SUMMARY",
        points: [
          "Market shows high volatility due to Black Sea logistics disruptions and EU regulatory shifts.",
          "Palm oil maintains price advantage: POGO spread is positive ($100–200/ton discount to gasoil), supporting EU biodiesel demand.",
          "Logistics: Middle Corridor (TITR) reduced transit to 15–19 days, becoming the preferred route for Malaysian specialty fats.",
          "EUDR: Compliance costs reduced by 75%. B2B buyers exempt from DDS submission, easing internal trade."
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          {
            country: "Serbia 🇷🇸",
            date: "May 1, 2026",
            text: "New labeling rules enforced: products with palm fat must carry a 'yellow triangle' warning. Law on Trading Practices adopted, requiring digital registration of all purchases ('e-otkupno mesto')."
          },
          {
            country: "Poland 🇵🇱",
            date: "May 4, 2026",
            text: "Hydrological drought declared. Rapeseed yield potential dropped to 1–1.5 t/ha. Estimated deficit of 500,000 tons opens window for palm oil imports in confectionery sector."
          },
          {
            country: "Bulgaria 🇧🇬",
            date: "Mid-May 2026",
            text: "New berth at Port Varna (depth -12.78m) operational, allowing direct discharge of large SE Asian tankers. Bulgaria offers lowest CIF prices in EU."
          },
          {
            country: "Czech Republic 🇨🇿",
            date: "May 2026",
            text: "New decrees on mayonnaise (>70% fat) and mandatory separate placement of vegetable and animal fats in retail."
          },
          {
            country: "The Baltics 🇱🇹🇱🇻🇪🇪",
            date: "Q1 2026",
            text: "Port of Klaipėda handled 374,000 TEU (+38% y/y), controlling 46% of Baltic market. Emergency reserve release strategy announced."
          }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          {
            country: "Uzbekistan 🇺🇿",
            text: "Utilization crisis: crushing capacity usage at only 37% due to seed shortages. Sunflower oil imports from Kazakhstan jumped 41%. Proposal for Tashkent distribution hub before 2027 duty review."
          },
          {
            country: "Kazakhstan 🇰🇿",
            date: "May 14, 2026",
            text: "Launch of Caspian Route to Iran via Aktau port (150–200k tons/year). Record sunflower stocks (2.11 million tons)."
          },
          {
            country: "Azerbaijan 🇦🇿 & Georgia 🇬🇪",
            date: "May 7, 2026",
            text: "Memorandum on food safety system equivalence signed, facilitating trade of high-risk goods like specialty fats."
          }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: {
          title: "EUDR (EU Deforestation Regulation)",
          status: "Simplification Phase",
          points: [
            "May 4th Report: 75% reduction in compliance costs (from €8.1bn to €2bn).",
            "Responsibility lies only with the first importer (DDS submission).",
            "B2B buyers (margarine/confectionery producers) exempt from submitting their own statements."
          ]
        },
        rediii: {
          title: "RED III (Renewable Energy Directive)",
          status: "National Transposition",
          points: [
            "Gradual phase-out of Palm Oil Methyl Ester (POME) from RED III targets due to ILUC criteria.",
            "POGO spread remains positive, maintaining biodiesel profitability where national quotas allow.",
            "Volumes expected to shift from bio-energy to food and oleochemical sectors."
          ]
        }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Transit Time (Asia-EU)", titr: "15–19 Days", bs: "37–45 Days (Cape)", change: "+9.9% (Speed up)" },
          { param: "Freight Rate ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "Downward" },
          { param: "Insurance", titr: "Standard", bs: "1% of Vessel Value", change: "+2.2%" },
          { param: "Risks", titr: "Customs Digitalization", bs: "Drone Strikes (High Risk)", change: "+4.5%" }
        ],
        note: "TITR: End-to-end delivery reduced from 53 days (2022) to 15 days (2026). Black Sea: War risk premiums updated every 24 hours."
      }
    }
  }
};

export default function ReportPage() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const t = REPORT_DATA[lang];

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HEADER & CONTROLS --- */}
      <header className="bg-slate-900 text-white py-8 px-6 md:px-12 border-b border-slate-700 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{t.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{t.subtitle} | {t.client}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 rounded-lg p-1 flex">
              <button 
                onClick={() => setLang('ru')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition ${lang === 'ru' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                RU
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>
            <Link href="/" className="text-xs text-slate-400 hover:text-white underline">
              ← Terminal
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 space-y-16">

        {/* --- I. EXECUTIVE SUMMARY --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 border-l-4 border-emerald-500 pl-4">{t.sections.exec.title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {t.sections.exec.points.map((point, idx) => (
              <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex gap-3">
                <span className="text-emerald-600 font-bold text-lg">•</span>
                <p className="text-sm text-slate-700 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- II. REGIONAL ANALYSIS (EUROPE) --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 border-l-4 border-blue-500 pl-4">{t.sections.europe.title}</h2>
          <div className="space-y-4">
            {t.sections.europe.items.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900">{item.country}</h3>
                  {item.date && <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded">{item.date}</span>}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- III. INDUSTRIAL OVERVIEW (CIS & CA) --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 border-l-4 border-amber-500 pl-4">{t.sections.cis.title}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {t.sections.cis.items.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <h3 className="font-bold text-lg text-slate-900 mb-2">{item.country}</h3>
                {item.date && <p className="text-xs text-amber-600 font-semibold mb-2">{item.date}</p>}
                <p className="text-sm text-slate-600 leading-relaxed flex-grow">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- IV. REGULATORY OUTLOOK --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 border-l-4 border-purple-500 pl-4">{t.sections.reg.title}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* EUDR */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-emerald-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">{t.sections.reg.eudr.title}</h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded uppercase">{t.sections.reg.eudr.status}</span>
              </div>
              <ul className="space-y-3">
                {t.sections.reg.eudr.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500">✔</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* RED III */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-amber-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">{t.sections.reg.rediii.title}</h3>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded uppercase">{t.sections.reg.rediii.status}</span>
              </div>
              <ul className="space-y-3">
                {t.sections.reg.rediii.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-amber-500">⚠</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* --- V. LOGISTICS --- */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-800 border-l-4 border-slate-600 pl-4">{t.sections.log.title}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Parameter</th>
                    <th className="px-6 py-4 text-emerald-700">TITR (Middle Corridor)</th>
                    <th className="px-6 py-4 text-slate-600">Black Sea Route</th>
                    <th className="px-6 py-4 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {t.sections.log.table.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{row.param}</td>
                      <td className="px-6 py-4 text-emerald-700 font-bold">{row.titr}</td>
                      <td className="px-6 py-4 text-slate-600">{row.bs}</td>
                      <td className="px-6 py-4 text-right text-slate-500">{row.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 p-4 text-xs text-slate-500 border-t border-slate-200">
              {t.sections.log.note}
            </div>
          </div>
        </section>

      </div>
      
      <footer className="bg-slate-100 py-8 text-center text-slate-500 text-sm border-t border-slate-200 mt-12">
        <p>© 2026 International Marketing Agency Ltd. Exclusive partner of Malaysian Palm Oil Council.</p>
        <p className="mt-1">Data verified as of May 18, 2026.</p>
      </footer>
    </main>
  );
}
