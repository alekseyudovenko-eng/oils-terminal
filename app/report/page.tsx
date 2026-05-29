"use client";
import { useState } from 'react';
import Layout from '@/components/Layout';

// ... (ВСТАВЬ СЮДА ВЕСЬ ОБЪЕКТ REPORT_DATA ИЗ ПРЕДЫДУЩЕГО ОТВЕТА) ...
// Для краткости я не дублирую его, используй тот же объект REPORT_DATA

const REPORT_DATA = { /* ...вставь сюда данные из предыдущего шага... */ }; 

export default function ReportPage() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  // Если REPORT_DATA еще не вставлен, код не заработает. Убедись, что он есть выше.
  const t = REPORT_DATA[lang]; 

  return (
    <Layout title="Analytical Report">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">{t.subtitle}</p>
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
                  {item.date && <span className="block text-xs font-mono text-slate-400 mb-1">{item.date}</span>}
                  {item.text}
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
