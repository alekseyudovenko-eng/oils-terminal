"use client";
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Download } from 'lucide-react';

export default function RegionalReviewPage() {
  const [dateRange, setDateRange] = useState("");

  useEffect(() => {
    const today = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(today.getDate() - 10);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setDateRange(`${tenDaysAgo.toLocaleDateString('ru-RU', options)} – ${today.toLocaleDateString('ru-RU', options)}`);
  }, []);

  const handlePrint = () => window.print();

  return (
    <Layout title="Regional Market Review">
      <div className="print:hidden mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Обзор региональных рынков</h1>
          <p className="text-slate-500 mt-1">Европа, Центральная Азия и Кавказ</p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-sm hover:bg-slate-800 transition">
          <Download size={16} /> Сохранить PDF
        </button>
      </div>

      <div className="space-y-10 max-w-5xl mx-auto print:max-w-none print:space-y-6">
        
        {/* HEADER FOR PRINT */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">Обзор региональных рынков: Растительные масла и жиры</h1>
          <p className="text-sm text-slate-500">Период: {dateRange} | Для: Malaysian Palm Oil Council</p>
        </div>

        {/* 1. EUDR & RED III */}
        <section className="bg-white p-6 rounded-sm border border-slate-200 print:border-0 print:p-0">
          <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">I. Регуляторная политика ЕС (EUDR & RED III)</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-emerald-700 mb-2">EUDR (Deforestation Regulation)</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                <strong>Статус:</strong> Фаза упрощения (Simplification Phase).
              </p>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                <li>Отчет от 4 мая подтвердил снижение затрат на комплаенс на <strong>75%</strong> (с €8.1 млрд до €2 млрд).</li>
                <li>Ответственность за подачу DDS (Due Diligence Statement) несет только <strong>первый импортер</strong>.</li>
                <li>B2B-покупатели (производители маргарина, кондитерских изделий) освобождены от подачи собственных заявлений.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-amber-700 mb-2">RED III (Renewable Energy)</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                <strong>Статус:</strong> Национальное транспонирование.
              </p>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                <li>Постепенный вывод пальмового биодизеля (POME) из целей RED III из-за критериев ILUC.</li>
                <li>Спред POGO (Palm Oil-Gas Oil) остается положительным ($100–200/тонна дисконта), что поддерживает рентабельность биодизеля там, где позволяют квоты.</li>
                <li>Ожидается перенаправление объемов пальмового масла из энерго-сектора в пищевой и олеохимию.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. EUROPEAN MARKETS */}
        <section className="bg-white p-6 rounded-sm border border-slate-200 print:border-0 print:p-0">
          <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">II. Рынки Европы: Ключевые события</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-24 font-bold text-slate-900 shrink-0">Сербия 🇷🇸</div>
              <div className="text-sm text-slate-700">
                <p className="mb-1"><strong>Маркировка "Желтый треугольник":</strong> С 1 мая 2026 все продукты с пальмовым жиром (сыры-аналоги, выпечка) обязаны иметь предупреждающую маркировку.</p>
                <p className="mb-1"><strong>Цифровая прозрачность:</strong> Система <em>"e-otkupno mesto"</em> требует регистрации всех закупок в открытом реестре.</p>
                <p><strong>Экспорт:</strong> Запрет на экспорт биокомпонентов продлен до 30 июня 2026.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-24 font-bold text-slate-900 shrink-0">Польша 🇵🇱</div>
              <div className="text-sm text-slate-700">
                <p className="mb-1"><strong>Климатический шок:</strong> 4 мая объявлена гидрологическая засуха. Урожайность рапса упала до 1–1.5 т/га.</p>
                <p><strong>Дефицит:</strong> Ожидается нехватка 500,000 тонн рапсового масла. Открыто окно возможностей для импорта пальмового масла в кондитерский сектор.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-24 font-bold text-slate-900 shrink-0">Болгария 🇧🇬</div>
              <div className="text-sm text-slate-700">
                <p><strong>Логистика:</strong> Порт Варна (Odessos PBM) запустил причал глубиной -12.78м. Прямые поставки танкерами из ЮВА без перевалки в Турции снизили CIF-цены.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-24 font-bold text-slate-900 shrink-0">Прибалтика 🇱🇹</div>
              <div className="text-sm text-slate-700">
                <p><strong>Рост грузооборота:</strong> Порт Клайпеда обработал 374,000 TEU (+38% г/г), контролируя 46% рынка. Стабилизация цен через выпуск аварийных резервов.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CENTRAL ASIA & CAUCASUS */}
        <section className="bg-white p-6 rounded-sm border border-slate-200 print:border-0 print:p-0">
          <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">III. Центральная Азия и Кавказ</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Узбекистан 🇺🇿</h3>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                <li><strong>Кризис мощностей:</strong> Загрузка НПЗ всего 37% из-за нехватки сырья.</li>
                <li><strong>Импорт:</strong> Рост импорта подсолнечного масла из Казахстана на 41%.</li>
                <li><strong>Возможность:</strong> Предложение посла о создании хаба MPOC в Ташкенте до пересмотра пошлин в 2027 году.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Казахстан 🇰🇿</h3>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                <li><strong>Новый маршрут:</strong> Запуск экспорта в Иран через порт Актау (150–200 тыс. тонн/год).</li>
                <li><strong>Запасы:</strong> Рекордные остатки подсолнечника (2.11 млн тонн, +38% г/г).</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. LOGISTICS TABLE */}
        <section className="bg-white p-6 rounded-sm border border-slate-200 print:border-0 print:p-0">
          <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">IV. Логистика: Сравнение коридоров</h2>
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 font-semibold text-slate-700">Параметр</th>
                <th className="p-3 font-semibold text-emerald-700">TITR (Средний коридор)</th>
                <th className="p-3 font-semibold text-slate-600">Черное море</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-medium">Время транзита</td>
                <td className="p-3 text-emerald-700 font-bold">15–19 дней</td>
                <td className="p-3 text-slate-500">37–45 дней (через Мыс)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Фрахт ($/FEU)</td>
                <td className="p-3 text-emerald-700 font-bold">$3,500 – $4,500</td>
                <td className="p-3 text-slate-500">$10,000 (Spot)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Риски</td>
                <td className="p-3 text-emerald-700">Цифровизация таможни</td>
                <td className="p-3 text-red-600">Атаки дронов (Высокий риск)</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2 italic">Источник: TITR Roadmap 2026, BIMCO Insurance Analytics.</p>
        </section>

      </div>
    </Layout>
  );
}
