// /analytics/<slug> — статья IMA.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SubscribeForm from '@/components/SubscribeForm';
import { getArticle, getArticles } from '@/lib/analytics';
import { getDict } from '@/lib/i18n-server';
import { EXTRA } from '@/lib/dict-extra';
import { localePath } from '@/lib/i18n';
import { fmtLongDate } from '@/lib/format';
import { SITE_NAME, SITE_URL, openGraphFor, pageAlternates } from '@/lib/site';

export const revalidate = 3600;
export function generateStaticParams() { return getArticles().map(a => ({ slug: a.slug })); }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return {};
  const { lang } = getDict();
  return {
    title: a.title, description: a.summary,
    openGraph: { ...openGraphFor(lang, `${a.title} — ${SITE_NAME}`, a.summary), type: 'article', publishedTime: a.date },
    alternates: pageAlternates(`/analytics/${a.slug}`, lang),
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const { lang } = getDict();
  const x = EXTRA[lang].analytics;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title.slice(0, 110), description: a.summary,
    datePublished: a.date, inLanguage: a.lang, url: SITE_URL + `/analytics/${a.slug}`,
    author: { '@type': 'Person', name: 'Aleksey Udovenko' }, publisher: { '@type': 'Organization', name: 'International Marketing Agency (IMA)' },
  };
  return (
    <>
      <SiteHeader active="market" />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <p className="text-sm mb-4"><a href={localePath(lang, '/analytics')} className="text-ink-2 hover:text-gold">← {x.all}</a></p>
        <article lang={a.lang} className="max-w-[72ch]">
          <p className="text-sm text-ink-3"><time dateTime={a.date}>{fmtLongDate(a.date, lang)}</time> · {a.author || x.author}</p>
          <h1 className="font-cond text-3xl font-semibold tracking-tight mt-2 leading-tight">{a.title}</h1>
          <p className="mt-4 text-lg text-ink-2 leading-relaxed">{a.summary}</p>
          <div className="mt-6 grid gap-4 leading-relaxed">{a.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          {a.sources && a.sources.length > 0 && (
            <ul className="mt-8 text-sm text-ink-2 list-disc pl-5 grid gap-1">
              {a.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-gold">{s.title}</a></li>)}
            </ul>
          )}
        </article>
        <div className="mt-10"><SubscribeForm lang={lang} source={`article:${a.slug}`} /></div>
      </main>
      <SiteFooter updatedAt={null} />
    </>
  );
}
