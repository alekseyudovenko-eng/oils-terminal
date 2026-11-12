// /chart/fcpo — график цены инструмента: дневные закрытия за всю загруженную историю.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PriceChart from '@/components/PriceChart';
import SubscribeForm from '@/components/SubscribeForm';
import { getQuotes } from '@/lib/quotes';
import { getPriceHistory } from '@/lib/price-history';
import { CHART_IDS } from '@/lib/chart-ids';
import { INSTRUMENTS } from '@/lib/instruments';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { EXTRA } from '@/lib/dict-extra';
import { INTL, localePath } from '@/lib/i18n';
import { instText } from '@/lib/quote-i18n';
import { fmtPrice } from '@/lib/format';
import { SITE_NAME, openGraphFor, pageAlternates } from '@/lib/site';
import Change from '@/components/Change';

export const revalidate = 600;
export function generateStaticParams() { return CHART_IDS.map(id => ({ id })); }

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const inst = INSTRUMENTS.find(i => i.id === params.id);
  if (!inst || !CHART_IDS.includes(params.id)) return {};
  const { lang, t } = getDict();
  const x = EXTRA[lang].chart;
  const it = instText(t, inst);
  const title = fill(x.metaTitle, { name: it.name, venue: it.venue });
  const description = fill(x.metaDesc, { name: it.name, venue: it.venue });
  return { title, description, openGraph: openGraphFor(lang, `${title} — ${SITE_NAME}`, description), alternates: pageAlternates(`/chart/${params.id}`, lang) };
}

export default async function ChartPage({ params }: { params: { id: string } }) {
  const inst = INSTRUMENTS.find(i => i.id === params.id);
  if (!inst || !CHART_IDS.includes(params.id)) notFound();
  const [quotes, history] = await Promise.all([getQuotes(), getPriceHistory(params.id)]);
  const { lang, t } = getDict();
  const x = EXTRA[lang];
  const it = instText(t, inst);
  const q = quotes.quotes.find(z => z.id === params.id);
  // Сегодняшняя цена дописывается в конец, если её ещё нет в истории.
  const today = quotes.fetchedAt.slice(0, 10);
  const points = [...history];
  if (q?.price != null && (!points.length || points[points.length - 1].d < today)) points.push({ d: today, c: q.price });

  return (
    <>
      <SiteHeader active="market" />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 py-8">
        <p className="text-sm mb-3"><a href={localePath(lang, '/market#prices')} className="text-ink-2 hover:text-gold">← {x.chart.back}</a></p>
        <h1 className="font-cond text-3xl font-semibold tracking-tight">{fill(x.chart.h1, { name: it.name })}</h1>
        <p className="text-ink-2 mb-6">{it.venue}</p>
        {q?.price != null && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-6">
            <p><span className="font-cond text-4xl font-semibold num">{fmtPrice(q.price, lang)}</span> <span className="text-ink-2">{it.unit}</span></p>
            <Change value={q.changePct} lang={lang} />
            {q.usdT != null && <p className="text-ink-2 text-sm">≈ ${fmtPrice(q.usdT, lang)} {x.chart.usdT}</p>}
          </div>
        )}
        <PriceChart points={points} unit={it.unit} locale={INTL[lang]} labels={{ ...x.chart }} height={380} />
        <p className="text-xs text-ink-3 mt-4 max-w-[80ch]">{x.chart.source}</p>

        <h2 className="font-cond text-xl font-semibold mt-10 mb-3">{x.chart.other}</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {CHART_IDS.filter(id => id !== params.id).map(id => {
            const i2 = INSTRUMENTS.find(i => i.id === id)!;
            const tx = instText(t, i2);
            return <li key={id}><a href={localePath(lang, `/chart/${id}`)} className="inline-block rounded border border-rule bg-panel px-3 py-1.5 hover:border-gold">{tx.name} <span className="text-ink-3">· {tx.venue}</span></a></li>;
          })}
        </ul>

        <div className="mt-10"><SubscribeForm lang={lang} source={`chart:${params.id}`} /></div>
      </main>
      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
