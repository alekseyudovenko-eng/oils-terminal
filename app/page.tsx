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
import { getQuotes } from '@/lib/quotes';
import { getNews } from '@/lib/news';

export const revalidate = 600;

export default async function OverviewPage() {
  const [quotes, news] = await Promise.all([getQuotes(), getNews()]);

  return (
    <>
      <SiteHeader active="overview" />
      <QuoteTicker data={quotes} />
      <Hero data={quotes} />

      <main className="mx-auto max-w-page w-full px-4 sm:px-6 grid gap-x-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Section id="indices" title="Основные индексы">
          {quotes.error && <Notice>Котировки сейчас недоступны. Попробуйте обновить страницу через несколько минут.</Notice>}
          <QuotesTable quotes={quotes.quotes} compact />
        </Section>

        <Section
          id="news"
          title="Новости"
          action={<Link href="/market#news" className="text-sm text-ink-2 hover:text-gold underline underline-offset-2">Все новости за месяц</Link>}
        >
          <NewsList news={news} limit={12} />
        </Section>
      </main>

      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
