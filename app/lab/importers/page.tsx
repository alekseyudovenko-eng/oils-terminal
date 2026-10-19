// /lab/importers — закрытая страница «Лаборатории IMA»: ключевые импортёры по странам.
// Доступ по тому же паролю, что и /lab (middleware.ts, matcher '/lab/:path*').
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import ImportersExplorer from '@/components/ImportersExplorer';
import { IMPORTERS } from '@/lib/importers';

export const metadata: Metadata = {
  title: 'Импортёры по странам · Лаборатория IMA',
  robots: { index: false, follow: false },
};

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
            {IMPORTERS.countries.length} страны · {total} компаний · обновлено {updated}
          </p>
        </section>
        <ImportersExplorer countries={IMPORTERS.countries} />
      </main>
    </>
  );
}
