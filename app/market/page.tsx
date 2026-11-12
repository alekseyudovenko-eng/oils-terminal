// «Рынок»: бегущая строка новостей, все котировки и спреды, балансы USDA, региональные балансы, новости.
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import NewsTicker from '@/components/NewsTicker';
import QuotesTable from '@/components/QuotesTable';
import SpreadsTable from '@/components/SpreadsTable';
import Sparkline from '@/components/Sparkline';
import PsdExplorer from '@/components/PsdExplorer';
import RegionalBalances from '@/components/RegionalBalances';
import QuickCards from '@/components/QuickCards';
import MarketCharts from '@/components/MarketCharts';
import { getPriceHistory } from '@/lib/price-history';
import { INSTRUMENTS } from '@/lib/instruments';
import { instText } from '@/lib/quote-i18n';
import { QUICK } from '@/lib/dict-quick';
import { EXTRA } from '@/lib/dict-extra';
import { INTL } from '@/lib/i18n';
import Section from '@/components/Section';
import Notice from '@/components/Notice';
import SubscribeForm from '@/components/SubscribeForm';
import MarketCalendar from '@/components/MarketCalendar';
import { getQuotes } from '@/lib/quotes';
import { getNewsFeed } from '@/lib/news';
import { getPsd } from '@/lib/psd';
import { buildPsdView } from '@/lib/psd-view';
import { getHistory } from '@/lib/snapshots';
import { fmtTimeUtc, fmtLongDate as fmtDay } from '@/lib/format';
import { lastWasdeBefore } from '@/lib/market-calendar';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { METRICS } from '@/lib/psd-meta';
import { SITE_NAME, openGraphFor, pageAlternates } from '@/lib/site';

export const revalidate = 600;
export function generateMetadata(): Metadata {
  const { lang, t } = getDict();
  return {
    title: t.meta.marketTitle,
    description: t.meta.marketDescription,
    openGraph: openGraphFor(lang, `${t.meta.marketTitle} — ${SITE_NAME}`, t.meta.marketDescription),
    alternates: pageAlternates('/market', lang),
  };
}

const ANCHORS = ['prices', 'charts', 'spreads', 'usda', 'regions'] as const;
const CHART_SET = ['fcpo', 'dce_olein', 'zl', 'brent', 'usdmyr'];

export default async function MarketPage() {
  const [quotes, feed, psd, pogoHistory, ...hists] = await Promise.all([getQuotes(), getNewsFeed(), getPsd(), getHistory('pogo'), ...CHART_SET.map(getPriceHistory)]);
  const { lang, t } = getDict();
  const m = t.market;
  const news = feed.items;
  const views = buildPsdView(psd.rows, lang).map(v => ({ ...v, label: t.psd.oils[v.id] }));
  const q2 = QUICK[lang];
  const series = CHART_SET.map((id, i) => {
    const inst = INSTRUMENTS.find(z => z.id === id)!;
    const it = instText(t, inst);
    const pts = [...hists[i]];
    const cq = quotes.quotes.find(z => z.id === id);
    const today = quotes.fetchedAt.slice(0, 10);
    if (cq?.price != null && (!pts.length || pts[pts.length - 1].d < today)) pts.push({ d: today, c: cq.price });
    return { id, name: it.name, unit: it.unit, points: pts };
  }).filter(s => s.points.length >= 2);
  const hasPsd = views.some(v => v.years.length > 0);

  return (
    <>
      <SiteHeader active="market" />
      <NewsTicker news={news} />

      <nav aria-label={m.onPage} className="border-b border-rule bg-panel">
        <ul className="mx-auto max-w-page px-4 sm:px-6 flex gap-5 overflow-x-auto text-sm py-2.5">
          {ANCHORS.map(a => (
            <li key={a}><a href={`#${a}`} className="text-ink-2 hover:text-ink whitespace-nowrap">{a === 'charts' ? q2.anchor : m.anchors[a as Exclude<typeof a, 'charts'>]}</a></li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-page w-full px-4 sm:px-6">
        <h1 className="sr-only">{m.h1}</h1>

        <QuickCards quotes={quotes} />

        <Section id="prices" title={m.anchors.prices} note={m.pricesNote}>
          {quotes.error && <Notice>{t.quotes.unavailable}</Notice>}
          <QuotesTable quotes={quotes.quotes} />
        </Section>

        {series.length > 0 && (
          <Section id="charts" title={q2.chartsTitle} note={q2.chartsNote}>
            <MarketCharts series={series} locale={INTL[lang]} labels={{ ...EXTRA[lang].chart }} />
          </Section>
        )}

        <Section id="spreads" title={m.anchors.spreads} note={m.spreadsNote}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {quotes.spreads.length > 0 ? <SpreadsTable spreads={quotes.spreads} /> : <p className="text-ink-2">{m.spreadsEmpty}</p>}
            <div>
              <h3 className="font-cond text-lg font-semibold mb-2">{m.pogoYear}</h3>
              <Sparkline points={pogoHistory} label="POGO" />
            </div>
          </div>
        </Section>

        <Section
          id="usda"
          title={m.anchors.usda}
          note={<>{m.usdaNote}{psd.updatedAt && (() => { const w = lastWasdeBefore(psd.updatedAt!); return w ? fill(m.usdaWasde, { date: fmtDay(w, lang), time: fmtTimeUtc(psd.updatedAt!, lang) }) : fill(m.usdaLoaded, { time: fmtTimeUtc(psd.updatedAt!, lang) }); })()}</>}
        >
          {hasPsd ? (
            <PsdExplorer
              views={views}
              lang={lang}
              t={{ ...t.psd, metricList: METRICS.map(x => ({ id: x.id, label: t.psd.metrics[x.id] })) }}
            />
          ) : <Notice>{m.usdaMissing}</Notice>}
        </Section>

        <Section id="regions" title={m.regionsTitle} note={m.regionsNote}>
          <RegionalBalances lang={lang} t={t.regional} />
        </Section>

        <MarketCalendar lang={lang} days={45} max={14} />
        <div className="py-8"><SubscribeForm lang={lang} source="market" /></div>
      </main>

      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
