// /lab/importers — закрытая страница «Лаборатории IMA»: ключевые импортёры по странам.
// Доступ по тому же паролю, что и /lab (middleware.ts, matcher '/lab/:path*').
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import ImportersExplorer from '@/components/ImportersExplorer';
import ImportersDashboard from '@/components/ImportersDashboard';
import { IMPORTERS } from '@/lib/importers';
import { getDict } from '@/lib/i18n-server';
import { getLabDict } from '@/lib/lab-i18n';
import { localizeImporters } from '@/lib/importers-i18n';
import { fill } from '@/lib/dict';
import { INTL, type Locale } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  const { t } = getDict();
  return { title: `${t.lab.pages.importers} · ${t.lab.title}`, robots: { index: false, follow: false } };
}

/** Форма слова по числу: [1, 2–4, 5+]; для языков без склонения формы совпадают, английский — 1 / остальное. */
const plural = (n: number, [one, few, many]: string[], lang: Locale) =>
  lang === 'ru'
    ? n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many
    : n === 1 ? one : many;

export default function ImportersPage() {
  const { lang, L } = getLabDict();
  const I = L.imp;
  const { countries, vocab } = localizeImporters(IMPORTERS.countries, lang, I.notes);
  const total = countries.reduce((s, c) => s + c.companies.length, 0);
  const updated = new Date(IMPORTERS.updatedAt).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <LabHeader current="/lab/importers" note={getDict().t.lab.notes.importers} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section aria-labelledby="imp-title" className="pt-8 pb-6">
          <h1 id="imp-title" className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{I.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            {I.lead}
          </p>
          <p className="mt-1 text-xs text-ink-3 num">
            {fill(I.stats, {
              countries: `${countries.length} ${plural(countries.length, I.countriesN, lang)}`,
              companies: `${total} ${plural(total, I.companiesN, lang)}`,
              date: updated,
            })}
          </p>
        </section>
        <ImportersDashboard countries={countries} lang={lang} L={I} vocab={vocab} />
        <section aria-labelledby="cards-title" className="mt-14 pt-8 border-t border-rule">
          <h2 id="cards-title" className="font-cond text-3xl font-semibold tracking-tight mb-4">{I.cards}</h2>
          <ImportersExplorer countries={countries} lang={lang} L={I} />
        </section>
      </main>
    </>
  );
}
