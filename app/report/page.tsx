"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import OilBalanceTable from '@/components/OilBalanceTable';
import { Download, FileText, FileType } from 'lucide-react';

export default function ReportPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем ВСЕ данные для отчета одним запросом
    fetch('/api/full-report')
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8">Загрузка данных отчета...</div>;

  return (
    <Layout title="Full Analytical Report">
      {/* Кнопки управления (скрываем при печати) */}
      <div className="print:hidden mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Панель управления отчетом</h1>
        <button 
          onClick={handlePrint}
          className="bg-slate-900 text-white px-4 py-2 rounded-sm flex items-center gap-2"
        >
          <Download size={16} /> Скачать PDF (Полный отчет)
        </button>
      </div>

      {/* --- РАЗДЕЛ 1: АНАЛИТИЧЕСКИЙ ОТЧЕТ (Текст) --- */}
      <section className="mb-12 print:mb-8">
        <h2 className="text-xl font-bold border-b pb-2 mb-4">I. Аналитический обзор (May 2026)</h2>
        {/* Здесь твой текст отчета, который мы верстали ранее */}
        <p>Текст отчета про EUDR, Сербию и логистику...</p>
      </section>

      {/* --- РАЗДЕЛ 2: MARKET QUOTES (Цены) --- */}
      <section className="mb-12 print:mb-8 break-inside-avoid">
        <h2 className="text-xl font-bold border-b pb-2 mb-4">II. Market Quotes (Live Data)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left">Commodity</th>
              <th className="p-2 text-right">Price (USD/MT)</th>
              <th className="p-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.marketQuotes.map((item: any) => (
              <tr key={item.id} className="border-b">
                <td className="p-2 font-medium">{item.commodity}</td>
                <td className="p-2 text-right font-mono">${item.value}</td>
                <td className="p-2 text-right text-gray-500">
                  {new Date(item.verified_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* --- РАЗДЕЛ 3: REGIONAL BALANCE (Баланс) --- */}
      <section className="mb-12 print:mb-8">
        <h2 className="text-xl font-bold border-b pb-2 mb-4">III. Regional Balance Sheet</h2>
        {/* Используем твой компонент, он уже умеет работать с данными */}
        <OilBalanceTable />
      </section>
    </Layout>
  );
}
