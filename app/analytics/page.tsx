// /analytics — раздел «Аналитика IMA»: список статей и подписка на еженедельный обзор.
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SubscribeForm from '@/components/SubscribeForm';
import { getArticles } from '@/lib/analytics';
import { getDict } from '@/lib/i18n-server';
import { EXTRA } from '@/lib/dict-extra';
import { localePath } from '@/lib/i18n';
import { fmtLongDate } from '@/lib/format';
import { SITE_NAME, openGraphFor, pageAlternates } from '@/lib/site';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { lang } = getDict();
  const x = EXTRA[lang].analytics;
  return { title: x.title, description: x.desc, openGraph: openGraphFor(lang, `${x.title} — ${SITE_NAME}`, x.desc), alternates: pageAlternates('/analytics', lang) };
}

export default function AnalyticsPage() {
  const { lang } = getDict();
  const x = EXTRA[lang].analytics;
  const articles = getArticles();
  return (
    <>
      <SiteHeader active="market" />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 py-8">
        <h1 className="font-cond text-3xl font-semibold tracking-tight">{x.title}</h1>
        <p className="text-ink-2 mt-2 max-w-[75ch]">{x.desc}</p>
        {articles.length === 0 ? (
          <p className="mt-8 text-ink-2">{x.empty}</p>
        ) : (
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {articles.map(a => (
              <li key={a.slug} className="rounded-lg border border-rule bg-panel p-5">
                <p className="text-xs text-ink-3"><time dateTime={a.date}>{fmtLongDate(a.date, lang)}</time></p>
                <h2 className="font-cond text-xl font-semibold mt-1 leading-snug">
                  <a href={localePath(lang, `/analytics/${a.slug}`)} className="hover:text-gold">{a.title}</a>
                </h2>
                <p className="text-sm text-ink-2 mt-2">{a.summary}</p>
                <p className="mt-3 text-sm"><a href={localePath(lang, `/analytics/${a.slug}`)} className="underline underline-offset-2 hover:text-gold">{x.read} →</a></p>
              </li>
            ))}
          </ul>
        )}
        <div id="subscribe" className="mt-10 scroll-mt-4"><SubscribeForm lang={lang} source="analytics" /></div>
      </main>
      <SiteFooter updatedAt={null} />
    </>
  );
}
