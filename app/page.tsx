// Главная: бегущая строка котировок, FCPO и POGO крупно, таблица индексов, свежие новости.
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import QuoteTicker from '@/components/QuoteTicker';
import Hero from '@/components/Hero';
import QuotesTable from '@/components/QuotesTable';
import NewsList from '@/components/NewsList';
import Section from '@/components/Section';
import Notice from '@/components/Notice';
import PriceChart from '@/components/PriceChart';
import MpobCard from '@/components/MpobCard';
import MarketCalendar from '@/components/MarketCalendar';
import RegionBlock from '@/components/RegionBlock';
import SubscribeForm from '@/components/SubscribeForm';
import { getPriceHistory } from '@/lib/price-history';
import { getMpobLatest, getRegionTrade } from '@/lib/market-cards';
import { upcomingEvents } from '@/lib/market-calendar';
import { getArticles } from '@/lib/analytics';
import { EXTRA } from '@/lib/dict-extra';
import { INTL } from '@/lib/i18n';
import { getQuotes } from '@/lib/quotes';
import { getNewsFeed } from '@/lib/news';
import { fmtTimeUtc } from '@/lib/format';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { localePath } from '@/lib/i18n';
import { pageAlternates } from '@/lib/site';
import type { Metadata } from 'next';

export const revalidate = 600;
export function generateMetadata(): Metadata {
  return { alternates: pageAlternates('/', getDict().lang) };
}

export default async function OverviewPage() {
  const [quotes, feed, fcpo, mpob, region] = await Promise.all([getQuotes(), getNewsFeed(), getPriceHistory('fcpo'), getMpobLatest(), getRegionTrade()]);
  const { lang, t } = getDict();
  const x = EXTRA[lang];
  const q = quotes.quotes.find(z => z.id === 'fcpo');
  const today = quotes.fetchedAt.slice(0, 10);
  const fcpoPoints = [...fcpo];
  if (q?.price != null && (!fcpoPoints.length || fcpoPoints[fcpoPoints.length - 1].d < today)) fcpoPoints.push({ d: today, c: q.price });
  const nextMpob = upcomingEvents(new Date(), 45).find(e => e.kind === 'mpob')?.date ?? null;
  const articles = getArticles().slice(0, 3);

  return (
    <>
      <SiteHeader active="overview" />
      <QuoteTicker data={quotes} />
      <Hero data={quotes} />

      <main className="mx-auto max-w-page w-full px-4 sm:px-6 grid gap-x-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {fcpoPoints.length > 1 && (
            <Section id="chart" title={x.chart.homeTitle}
              action={<Link href={localePath(lang, '/chart/fcpo')} className="text-sm text-ink-2 hover:text-gold underline underline-offset-2">{x.chart.open} →</Link>}>
              <PriceChart points={fcpoPoints} unit="MYR/t" locale={INTL[lang]} labels={{ ...x.chart }} initial="1y" height={260} />
            </Section>
          )}
          <Section id="indices" title={t.overview.indices}>
            {quotes.error && <Notice>{t.quotes.unavailable}</Notice>}
            <QuotesTable quotes={quotes.quotes} />
          </Section>
          <RegionBlock data={region} lang={lang} />
          <div className="py-8"><SubscribeForm lang={lang} source="home" compact /></div>
        </div>

        <div className="min-w-0">
        <MpobCard data={mpob} lang={lang} nextDate={nextMpob} />
        <MarketCalendar lang={lang} />
        <Section
          id="news"
          title={t.overview.news}
          note={feed.curated
            ? <>{t.overview.newsCurated}{feed.updatedAt && fill(t.overview.newsUpdated, { time: fmtTimeUtc(feed.updatedAt, lang) })}.</>
            : t.overview.newsAuto}
          action={<Link href={localePath(lang, '/market#news')} className="text-sm text-ink-2 hover:text-gold underline underline-offset-2">{t.overview.allNews}</Link>}
        >
          <NewsList news={feed.items} limit={12} />
          <p className="mt-4 text-sm text-ink-2">
            {t.footer.telegram.split('{link}')[0]}
            <a href="https://t.me/oilpalm" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-gold">@oilpalm</a>
            {t.footer.telegram.split('{link}')[1]}
          </p>
        </Section>
        </div>
      </main>

      <div className="mx-auto max-w-page w-full px-4 sm:px-6 pb-10 grid gap-8">
        {articles.length > 0 && (
          <section aria-labelledby="an-title">
            <div className="flex items-baseline justify-between mb-3">
              <h2 id="an-title" className="font-cond text-2xl font-semibold tracking-tight">{x.analytics.home}</h2>
              <Link href={localePath(lang, '/analytics')} className="text-sm text-ink-2 hover:text-gold underline underline-offset-2">{x.analytics.all}</Link>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {articles.map(a => (
                <li key={a.slug} className="rounded-lg border border-rule bg-panel p-4">
                  <a href={localePath(lang, `/analytics/${a.slug}`)} className="font-cond text-lg font-semibold hover:text-gold leading-snug">{a.title}</a>
                  <p className="text-sm text-ink-2 mt-1">{a.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
