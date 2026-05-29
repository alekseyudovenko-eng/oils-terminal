"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

// Функция для форматирования даты
const formatDate = (date: Date) => {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const REPORT_DATA = {
  ru: {
    title: "Аналитический отчет: Рынок растительных масел",
    // Даты будут подставлены динамически
    sections: {
      exec: {
        title: "I. EXECUTIVE SUMMARY (Сводка за 10 дней)",
        points: [
          "Логистика: Средний коридор (TITR) закрепил преимущество с транзитом 15–19 дней. Черноморский маршрут остается зоной высокого риска (премии до 1%).",
          "Регуляторика ЕС: Отчет об упрощении EUDR подтвердил снижение затрат на комплаенс на 75%. B2B-покупатели освобождены от DDS.",
          "Производство: Гидрологическая засуха в Польше снизила потенциал урожайности рапса до 1–1.5 т/га. Ожидается дефицит 500 тыс. тонн.",
          "Цены: Пальмовое масло торгуется с дисконтом $100–200/тонна к дизтопливу (POGO), сохраняя рентабельность биодизеля в ЕС."
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          {
            country: "Сербия 🇷🇸",
            text: "Действует маркировка «Желтый треугольник» для продуктов с пальмовым маслом. Система «e-otkupno mesto» требует цифровой регистрации всех закупок. Экспорт биокомпонентов ограничен до конца месяца."
          },
          {
            country: "Польша 🇵🇱",
            text: "Засуха в Великопольском и Любушском воеводствах. PSPO оценивает дефицит рапсового масла в сезоне 2026/27 в 500,000 тонн. Растет спрос на импортные заменители."
          },
          {
            country: "Болгария 🇧🇬",
            text: "Порт Варна (Odessos PBM) работает на полной мощности нового причала (-12.78м). Прямые поставки из ЮВА без перевалки в Турции снижают CIF-цены."
          },
          {
            country: "Прибалтика 🇱🇹",
            text: "Порт Клайпеда контролирует 46% рынка Балтии. Стратегия использования аварийных резервов стабилизирует цены на топливо."
          }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          {
            country: "Казахстан 🇰🇿",
            text: "Активная фаза экспорта по Каспийскому маршруту в Иран (порт Актау). Отгружено более 10,000 тонн подсолнечного масла за месяц. Запасы семян рекордные (2.11 млн т)."
          },
          {
            country: "Узбекистан 🇺🇿",
            text: "Загрузка НПЗ остается низкой (37%) из-за нехватки сырья. Импорт из Казахстана покрыл лишь часть дефицита. Обсуждается создание хаба MPOC в Ташкенте."
          },
          {
            country: "Азербайджан 🇦🇿",
            text: "Реализация меморандума с Грузией о взаимном признании систем безопасности. Импорт пальмового масла стабилен на уровне 64.6 тыс. тонн/мес."
          }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: {
          title: "EUDR (EU Deforestation Regulation)",
          status: "Simplification Phase (Active)",
          points: [
            "Отчет: Затраты на комплаенс снижены с €8.1 млрд до €2 млрд.",
            "Ответственность только на первом импортере. Переработчики (B2B) освобождены от подачи DDS.",
            "Малайзия и Индонезия остаются в списке стран среднего риска."
          ]
        },
        rediii: {
          title: "RED III (Renewable Energy Directive)",
          status: "National Transposition",
          points: [
            "Постепенный вывод POME (пальмового биодизеля) из целей RED III из-за ILUC.",
            "Высокий спред POGO поддерживает использование пальмового масла в биодизеле там, где позволяют национальные квоты.",
            "Ожидается сдвиг объемов в пищевой сектор и олеохимию."
          ]
        }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Transit Time (Asia-EU)", titr: "15–19 Days", bs: "37–45 Days (Cape)", change: "TITR Faster" },
          { param: "Freight Rate ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "TITR Cheaper" },
          { param: "Insurance Premium", titr: "Standard", bs: "1% of Vessel Value", change: "Black Sea Risk" },
          { param: "Security Status", titr: "Digitalizing Customs", bs: "Drone Strikes (High)", change: "TITR Safer" }
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
          "Logistics: Middle Corridor (TITR) solidified advantage with 15–19 day transit. Black Sea remains high-risk zone (premiums up to 1%).",
          "EU Regulation: EUDR Simplification Report confirmed 75% compliance cost reduction. B2B buyers exempt from DDS.",
          "Production: Hydrological drought in Poland dropped rapeseed yield potential to 1–1.5 t/ha. 500k ton deficit expected.",
          "Prices: Palm oil trades at $100–200/ton discount to gasoil (POGO), maintaining biodiesel profitability in EU."
        ]
      },
      europe: {
        title: "II. REGIONAL ANALYSIS OF EUROPEAN MARKETS",
        items: [
          {
            country: "Serbia 🇷🇸",
            text: "'Yellow Triangle' labeling for palm-containing products enforced. 'e-otkupno mesto' system requires digital registration of all purchases. Bio-component export ban extended."
          },
          {
            country: "Poland 🇵🇱",
            text: "Drought in Wielkopolskie and Lubuskie. PSPO estimates 500,000 ton rapeseed oil deficit for 2026/27. Growing demand for imported substitutes."
          },
          {
            country: "Bulgaria 🇧🇬",
            text: "Port Varna (Odessos PBM) operating new berth (-12.78m) at full capacity. Direct SE Asian deliveries without Turkish transshipment lower CIF prices."
          },
          {
            country: "The Baltics 🇱🇹",
            text: "Port of Klaipėda controls 46% of Baltic market. Emergency reserve strategy stabilizes fuel prices."
          }
        ]
      },
      cis: {
        title: "III. INDUSTRIAL OVERVIEW OF CIS AND CENTRAL ASIAN COUNTRIES",
        items: [
          {
            country: "Kazakhstan 🇰🇿",
            text: "Active export phase via Caspian Route to Iran (Aktau port). Over 10,000 tons of sunflower oil shipped this month. Record seed stocks (2.11m tons)."
          },
          {
            country: "Uzbekistan 🇺🇿",
            text: "Refinery utilization remains low (37%) due to seed shortages. Imports from Kazakhstan covered only part of deficit. MPOC hub proposal in Tashkent under discussion."
          },
          {
            country: "Azerbaijan 🇦🇿",
            text: "Implementation of memorandum with Georgia on food safety equivalence. Palm oil imports stable at 64.6k tons/month."
          }
        ]
      },
      reg: {
        title: "IV. REGULATORY OUTLOOK",
        eudr: {
          title: "EUDR (EU Deforestation Regulation)",
          status: "Simplification Phase (Active)",
          points: [
            "Report: Compliance costs reduced from €8.1bn to €2bn.",
            "Responsibility lies only with the first importer. Processors (B2B) exempt from DDS submission.",
            "Malaysia and Indonesia remain in 'standard risk' category."
          ]
        },
        rediii: {
          title: "RED III (Renewable Energy Directive)",
          status: "National Transposition",
          points: [
            "Gradual phase-out of POME from RED III targets due to ILUC criteria.",
            "High POGO spread supports palm oil use in biodiesel where national quotas allow.",
            "Volumes expected to shift to food and oleochemical sectors."
          ]
        }
      },
      log: {
        title: "V. LOGISTICS AND SUPPLY SECURITY: COMPARATIVE ANALYSIS",
        table: [
          { param: "Transit Time (Asia-EU)", titr: "15–19 Days", bs: "37–45 Days (Cape)", change: "TITR Faster" },
          { param: "Freight Rate ($/FEU)", titr: "$3,500 – $4,500", bs: "$10,000 (Spot)", change: "TITR Cheaper" },
          { param: "Insurance Premium", titr: "Standard", bs: "1% of Vessel Value", change: "Black Sea Risk" },
          { param: "Security Status", titr: "Digitalizing Customs", bs: "Drone Strikes (High)", change: "TITR Safer" }
        ],
        note: "TITR: End-to-end delivery reduced to 15 days thanks to customs digitalization. Black Sea: War risk premiums updated every 24 hours."
      }
    }
  }
};

export default function ReportPage() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [dateRange, setDateRange] = useState<string>("");

  // Вычисляем даты при загрузке компонента
  useEffect(() => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    
    const startStr = formatDate(tenDaysAgo);
    const endStr = formatDate(today);
    
    setDateRange(`${startStr} – ${endStr}`);
  }, []);

  const t = REPORT_DATA[lang];
  const subtitle = lang === 'ru' 
    ? `Европа, ЦА и Кавказ | ${dateRange} (Последние 10 дней)`
    : `Europe, CA & Caucasus | ${dateRange} (Last 10 Days)`;

  return (
    <Layout title="Analytical Report">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">{subtitle}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-sm">
          <button onClick={() => setLang('ru')} className={`px-3 py-1 text-xs font-bold uppercase ${lang === 'ru' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>RU</button>
          <button onClick={() => setLang('en')} className={`px-3 py-1 text-xs font-bold uppercase ${lang === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>EN</button>
        </div>
      </div>

      <div className="space-y-12">
        {/* Executive Summary */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.exec.title}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {t.sections.exec.points.map((point, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border-l-2 border-slate-300 text-sm text-slate-700 leading-relaxed">
                {point}
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
                <div className="text-sm text-slate-600 leading-relaxed">
                  {item.text}
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
              <div key={idx} className="p-4 border border-slate-200 rounded-sm">
                <h3 className="font-bold text-slate-900 mb-1">{item.country}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">{t.sections.reg.title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-slate-200 rounded-sm">
              <h3 className="font-bold text-slate-900 mb-2">{t.sections.reg.eudr.title}</h3>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] uppercase font-bold mb-4">{t.sections.reg.eudr.status}</span>
              <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                {t.sections.reg.eudr.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="p-6 border border-slate-200 rounded-sm">
              <h3 className="font-bold text-slate-900 mb-2">{t.sections.reg.rediii.title}</h3>
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
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.param}</td>
                    <td className="px-4 py-3 text-slate-700">{row.titr}</td>
                    <td className="px-4 py-3 text-slate-500">{row.bs}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{row.change}</td>
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
