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
import NewsList from '@/components/NewsList';
import Section from '@/components/Section';
import Notice from '@/components/Notice';
import { getQuotes } from '@/lib/quotes';
import { getNewsFeed } from '@/lib/news';
import { getPsd } from '@/lib/psd';
import { buildPsdView } from '@/lib/psd-view';
import { getHistory } from '@/lib/snapshots';
import { fmtTimeUtc } from '@/lib/format';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { METRICS } from '@/lib/psd-meta';

export const revalidate = 600;
export function generateMetadata(): Metadata {
  return { title: getDict().t.meta.market };
}

const ANCHORS = ['prices', 'spreads', 'usda', 'regions', 'news'] as const;

export default async function MarketPage() {
  const [quotes, feed, psd, pogoHistory] = await Promise.all([getQuotes(), getNewsFeed(), getPsd(), getHistory('pogo')]);
  const { lang, t } = getDict();
  const m = t.market;
  const news = feed.items;
  const views = buildPsdView(psd.rows, lang).map(v => ({ ...v, label: t.psd.oils[v.id] }));
  const hasPsd = views.some(v => v.years.length > 0);

  return (
    <>
      <SiteHeader active="market" />
      <NewsTicker news={news} />

      <nav aria-label={m.onPage} className="border-b border-rule bg-panel">
        <ul className="mx-auto max-w-page px-4 sm:px-6 flex gap-5 overflow-x-auto text-sm py-2.5">
          {ANCHORS.map(a => (
            <li key={a}><a href={`#${a}`} className="text-ink-2 hover:text-ink whitespace-nowrap">{m.anchors[a]}</a></li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-page w-full px-4 sm:px-6">
        <h1 className="sr-only">{m.h1}</h1>

        <Section id="prices" title={m.anchors.prices} note={m.pricesNote}>
          {quotes.error && <Notice>{t.quotes.unavailable}</Notice>}
          <QuotesTable quotes={quotes.quotes} />
        </Section>

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
          note={<>{m.usdaNote}{psd.updatedAt && fill(m.usdaLoaded, { time: fmtTimeUtc(psd.updatedAt, lang) })}</>}
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

        <Section id="news" title={m.newsTitle} note={feed.curated
            ? <>{fill(m.newsCurated, { n: news.length })}{feed.updatedAt && fill(m.newsUpdated, { time: fmtTimeUtc(feed.updatedAt, lang) })}{m.newsOrder}</>
            : fill(m.newsAuto, { n: news.length })}>
          <NewsList news={news} />
        </Section>
      </main>

      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
