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

export const revalidate = 600;
export const metadata: Metadata = { title: 'Рынок' };

const ANCHORS = [
  { href: '#prices', label: 'Цены' },
  { href: '#spreads', label: 'Спреды' },
  { href: '#usda', label: 'Мировые балансы' },
  { href: '#regions', label: 'Регионы' },
  { href: '#news', label: 'Новости' },
];

export default async function MarketPage() {
  const [quotes, feed, psd, pogoHistory] = await Promise.all([getQuotes(), getNewsFeed(), getPsd(), getHistory('pogo')]);
  const news = feed.items;
  const views = buildPsdView(psd.rows);
  const hasPsd = views.some(v => v.years.length > 0);

  return (
    <>
      <SiteHeader active="market" />
      <NewsTicker news={news} />

      <nav aria-label="На странице" className="border-b border-rule bg-panel">
        <ul className="mx-auto max-w-page px-4 sm:px-6 flex gap-5 overflow-x-auto text-sm py-2.5">
          {ANCHORS.map(a => (
            <li key={a.href}><a href={a.href} className="text-ink-2 hover:text-ink whitespace-nowrap">{a.label}</a></li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-page w-full px-4 sm:px-6">
        <h1 className="sr-only">Рыночные показатели</h1>

        <Section id="prices" title="Цены" note="Ближайшие фьючерсы. В долларах за тонну — по текущему курсу валют.">
          {quotes.error && <Notice>Котировки сейчас недоступны. Попробуйте обновить страницу через несколько минут.</Notice>}
          <QuotesTable quotes={quotes.quotes} />
        </Section>

        <Section id="spreads" title="Спреды" note="Отрицательный POGO означает, что пальмовое масло дешевле газойля и подмешивать его в биодизель выгодно без субсидий.">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {quotes.spreads.length > 0 ? <SpreadsTable spreads={quotes.spreads} /> : <p className="text-ink-2">Спреды появятся вместе с котировками.</p>}
            <div>
              <h3 className="font-cond text-lg font-semibold mb-2">POGO за год, $/т</h3>
              <Sparkline points={pogoHistory} label="POGO" />
            </div>
          </div>
        </Section>

        <Section
          id="usda"
          title="Мировые балансы"
          note={<>Производство, потребление, торговля и запасы по данным USDA, тыс. т готового масла.{psd.updatedAt && <> Загружено {fmtTimeUtc(psd.updatedAt)}.</>}</>}
        >
          {hasPsd ? <PsdExplorer views={views} /> : (
            <Notice>
              Данные USDA ещё не загружены. Они подтягиваются раз в месяц автоматически; чтобы загрузить сейчас,
              запустите задачу <code>/api/cron/usda-sync</code> с ключом CRON_SECRET. Нужен ключ USDA_API_KEY в настройках Vercel.
            </Notice>
          )}
        </Section>

        <Section id="regions" title="Региональные балансы" note="Оценки по странам, которых нет в детальной разбивке USDA. Источник каждой строки указан в последней колонке.">
          <RegionalBalances />
        </Section>

        <Section id="news" title="Новости за месяц" note={feed.curated
            ? <>{news.length} материалов, отобранных и проверенных по первоисточникам{feed.updatedAt && <>; обновлено {fmtTimeUtc(feed.updatedAt)}</>}. От свежих к старым.</>
            : `${news.length} материалов из автоматической ленты (отобранных новостей пока нет).`}>
          <NewsList news={news} />
        </Section>
      </main>

      <SiteFooter updatedAt={quotes.fetchedAt} />
    </>
  );
}
