// /news/2026-11-10-abc123 — страница отдельной новости: заголовок, краткое изложение, ссылка на первоисточник.
// Нужна, чтобы новости находили Google и Яндекс и чтобы ссылкой на новость можно было поделиться.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SubscribeForm from '@/components/SubscribeForm';
import { getAllCuratedNews } from '@/lib/news';
import { newsSlug } from '@/lib/news-slug';
import { newsText, regionText } from '@/lib/news-i18n';
import { getDict } from '@/lib/i18n-server';
import { EXTRA } from '@/lib/dict-extra';
import { localePath } from '@/lib/i18n';
import { fmtLongDate } from '@/lib/format';
import { SITE_NAME, SITE_URL, openGraphFor, pageAlternates } from '@/lib/site';

export const revalidate = 3600;

const find = (slug: string) => getAllCuratedNews().find(n => newsSlug(n) === slug);

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const n = find(params.slug);
  if (!n) return {};
  const { lang } = getDict();
  const tx = newsText(n, lang);
  const description = tx.summary.slice(0, 200);
  return {
    title: tx.title,
    description,
    openGraph: { ...openGraphFor(lang, `${tx.title} — ${SITE_NAME}`, description), type: 'article', publishedTime: n.publishedAt },
    alternates: pageAlternates(`/news/${params.slug}`, lang),
  };
}

export default function NewsPage({ params }: { params: { slug: string } }) {
  const { lang, t } = getDict();
  const n = find(params.slug);
  // Новость убрали из отбора — ведём на ленту, а не на 404.
  if (!n) redirect(localePath(lang, '/market#news'));
  const x = EXTRA[lang].newsPage;
  const tx = newsText(n, lang);
  const region = regionText(n.region, lang);
  const more = getAllCuratedNews().filter(m => m.url !== n.url).slice(0, 6);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: tx.title.slice(0, 110), description: tx.summary, datePublished: n.publishedAt,
    inLanguage: lang, url: SITE_URL + localePath(lang, `/news/${params.slug}`),
    isBasedOn: n.url, publisher: { '@type': 'Organization', name: 'International Marketing Agency (IMA)' },
  };
  return (
    <>
      <SiteHeader active="market" />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <p className="text-sm mb-4"><a href={localePath(lang, '/market#news')} className="text-ink-2 hover:text-gold">← {x.back}</a></p>
        <article className="max-w-[75ch]">
          <p className="text-sm text-ink-3">
            <time dateTime={n.publishedAt}>{fmtLongDate(n.publishedAt, lang)}</time>
            {region && <span className="ml-2">· {region}</span>}
            {n.topics.length > 0 && <span className="ml-2">· {n.topics.map(tp => t.news.topics[tp]).join(', ')}</span>}
          </p>
          <h1 className="font-cond text-3xl font-semibold tracking-tight mt-2 leading-tight">{tx.title}</h1>
          {tx.summary && <p className="mt-4 text-lg leading-relaxed">{tx.summary}</p>}
          <p className="mt-5 text-sm">
            {x.source}: <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2 hover:text-gold">{n.source}</a>
          </p>
          <p className="mt-2 text-xs text-ink-3">{x.note}</p>
        </article>

        <div className="mt-10"><SubscribeForm lang={lang} source="news" /></div>

        {more.length > 0 && (
          <section className="mt-10">
            <h2 className="font-cond text-xl font-semibold mb-3">{x.more}</h2>
            <ul className="divide-y divide-rule">
              {more.map(m => (
                <li key={m.url} className="py-2.5 text-sm">
                  <span className="text-ink-3 mr-3">{fmtLongDate(m.publishedAt, lang)}</span>
                  <a href={localePath(lang, `/news/${newsSlug(m)}`)} className="hover:text-gold underline-offset-2 hover:underline">{newsText(m, lang).title}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter updatedAt={null} />
    </>
  );
}
