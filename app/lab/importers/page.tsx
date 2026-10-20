// /lab/importers — закрытая страница «Лаборатории IMA»: ключевые импортёры по странам.
// Доступ по тому же паролю, что и /lab (middleware.ts, matcher '/lab/:path*').
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import ImportersExplorer from '@/components/ImportersExplorer';
import ImportersDashboard from '@/components/ImportersDashboard';
import { IMPORTERS } from '@/lib/importers';

export const metadata: Metadata = {
  title: 'Импортёры по странам · Лаборатория IMA',
  robots: { index: false, follow: false },
};

const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

export default function ImportersPage() {
  const total = IMPORTERS.countries.reduce((s, c) => s + c.companies.length, 0);
  const updated = new Date(IMPORTERS.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <LabHeader current="/lab/importers" note="Рабочая база, не для публикации." />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section aria-labelledby="imp-title" className="pt-8 pb-6">
          <h1 id="imp-title" className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">Ключевые импортёры по странам</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            Компании, которые закупают растительные масла, жиры и продукты их переработки: переработчики, производители
            маргарина и кондитерских жиров, трейдеры и дистрибьюторы.
          </p>
          <p className="mt-1 text-xs text-ink-3 num">
            {IMPORTERS.countries.length} {plural(IMPORTERS.countries.length, 'страна', 'страны', 'стран')} · {total} {plural(total, 'компания', 'компании', 'компаний')} · обновлено {updated}
          </p>
        </section>
        <ImportersDashboard countries={IMPORTERS.countries} />
        <section aria-labelledby="cards-title" className="mt-14 pt-8 border-t border-rule">
          <h2 id="cards-title" className="font-cond text-3xl font-semibold tracking-tight mb-4">Карточки стран</h2>
          <ImportersExplorer countries={IMPORTERS.countries} />
        </section>
      </main>
    </>
  );
}
