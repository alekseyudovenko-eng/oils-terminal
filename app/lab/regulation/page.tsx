// /lab/regulation — закрытая страница «Лаборатории IMA»: регуляторная политика по маркировкам и пальмовому маслу.
// Данные — data/regulation.json; Excel собирается тем же файлом (scripts/regulation/build_xlsx.py).
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import RegulationExplorer, { type RegLabels } from '@/components/RegulationExplorer';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { fmtDate, fmtLongDate } from '@/lib/format';
import { INTL } from '@/lib/i18n';
import { REG, contentLang, type Measure } from '@/lib/regulation';

export function generateMetadata(): Metadata {
  const { t } = getDict();
  return { title: `${t.reg.title} · ${t.lab.title}`, robots: { index: false, follow: false } };
}

/** Дата нормы для показа: полная, «ноябрь 2025» или «2025». */
function showDate(d: string, lang: Parameters<typeof fmtDate>[1]) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return fmtLongDate(d, lang);
  if (/^\d{4}-\d{2}$/.test(d)) return new Date(`${d}-01`).toLocaleDateString(INTL[lang!], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return d;
}

export default function RegulationPage() {
  const { lang, t } = getDict();
  const r = t.reg;
  const cl = contentLang(lang);
  const today = new Date().toISOString().slice(0, 10);
  const count = (s: Measure['status']) => REG.measures.filter(m => m.status === s).length;

  // Календарь: принятые нормы с точной датой (или месяцем), от ранних к поздним.
  const dated = REG.measures
    .filter(m => m.status !== 'proposal' && /^\d{4}-\d{2}/.test(m.date) && m.date >= '2024-01')
    .sort((a, b) => a.date.localeCompare(b.date));
  const firstAhead = dated.findIndex(m => m.date.length === 10 ? m.date > today : `${m.date}-31` > today);

  const scopeName = (s: string) =>
    s === 'EU' || s === 'EAEU' ? r.blocs[s] : REG.countries.find(c => c.code === s)?.name[lang] ?? s;

  const labels: RegLabels = {
    filters: r.filters, cols: r.cols, blocs: r.blocs, blocScope: r.blocScope, use: r.use, status: r.status, types: r.types,
    act: r.act, date: r.date, noDate: r.noDate, source: r.source, applies: r.applies, found: r.found, none: r.none,
    countriesTitle: r.countriesTitle, countriesNote: r.countriesNote, measuresTitle: r.measuresTitle,
  };

  return (
    <>
      <LabHeader current="/lab/regulation" note={t.lab.notes.regulation} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section aria-labelledby="reg-title" className="pt-8 pb-8 border-b border-rule">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="max-w-[68ch]">
              <h1 id="reg-title" className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{r.title}</h1>
              <p className="mt-2 text-ink-2">{r.lead}</p>
              <p className="mt-2 text-xs text-ink-3">
                {fill(r.asOf, { date: fmtLongDate(REG.updatedAt, lang), period: REG.period[cl] })}
                {r.contentLang && <> {r.contentLang}</>}
              </p>
            </div>
            <a href="/lab/regulation.xlsx" download
              className="inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-2">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4"><path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              {r.download}
            </a>
          </div>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {[
              [REG.countries.length, r.stats.countries],
              [REG.measures.length, r.stats.measures],
              [count('in_force'), r.stats.inForce],
              [count('upcoming'), r.stats.upcoming],
              [count('proposal'), r.stats.proposals],
            ].map(([n, l]) => (
              <div key={String(l)} className="flex items-baseline gap-1.5">
                <dt className="sr-only">{l}</dt>
                <dd className="font-cond text-2xl font-semibold num">{n}</dd>
                <dd className="text-ink-2">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="cal-title" className="py-8 border-b border-rule">
          <h2 id="cal-title" className="font-cond text-2xl font-semibold tracking-tight">{r.calTitle}</h2>
          <p className="mt-1 mb-5 text-sm text-ink-2 max-w-[75ch]">{r.calNote}</p>
          <ol className="relative border-l-2 border-rule ml-[7.5rem] sm:ml-[9.5rem]">
            {dated.map((m, i) => {
              const past = firstAhead === -1 || i < firstAhead;
              return (
                <li key={m.id} className="relative">
                  {i === firstAhead && (
                    <div className="relative -ml-[2px] my-3 flex items-center" aria-label={fmtLongDate(today, lang)}>
                      <span className="absolute -left-[7.5rem] sm:-left-[9.5rem] w-[7rem] sm:w-[9rem] text-right pr-3 text-xs font-medium text-gold num">
                        {fmtDate(today, lang)}
                      </span>
                      <span className="h-[2px] w-full bg-gold" />
                    </div>
                  )}
                  <div className={`relative pl-5 py-2.5 ${past ? 'text-ink-3' : ''}`}>
                    <span aria-hidden="true"
                      className={`absolute -left-[7px] top-[1.05rem] h-3 w-3 rounded-full border-2 ${past ? 'border-rule bg-paper' : 'border-gold bg-gold'}`} />
                    <time dateTime={m.date}
                      className={`absolute -left-[7.5rem] sm:-left-[9.5rem] w-[7rem] sm:w-[9rem] pr-4 text-right text-sm num ${past ? '' : 'font-medium text-ink'}`}>
                      {showDate(m.date, lang)}
                    </time>
                    <p className={past ? '' : 'font-medium text-ink'}>{m.title[cl]}</p>
                    <p className="text-xs mt-0.5">{scopeName(m.scope)} · {m.act[cl]}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <RegulationExplorer
          lang={lang}
          countries={REG.countries.map(c => ({
            code: c.code, bloc: c.bloc, name: c.name[lang], phrase: c.claimPhrase, use: c.claimUse,
            summary: c.summary[cl], practice: c.practice[cl],
          }))}
          measures={REG.measures.map(m => ({
            id: m.id, scope: m.scope, scopeName: scopeName(m.scope), type: m.type, status: m.status,
            date: m.date ? showDate(m.date, lang) : '', act: m.act[cl], title: m.title[cl], text: m.text[cl], url: m.url,
          }))}
          t={labels}
        />

        <p className="mt-10 text-xs text-ink-3 max-w-[80ch]">{r.disclaimer}</p>
      </main>
    </>
  );
}
