import { fmtDate, fmtAgo } from '@/lib/format';
import type { NewsItem } from '@/lib/news';
import { getDict } from '@/lib/i18n-server';
import { newsText, regionText } from '@/lib/news-i18n';

export default function NewsList({ news, limit }: { news: NewsItem[]; limit?: number }) {
  const { lang, t } = getDict();
  const items = limit ? news.slice(0, limit) : news;
  if (items.length === 0) {
    return <p className="py-6 text-ink-2">{t.news.empty}</p>;
  }
  return (
    <ol className="divide-y divide-rule">
      {items.map(n => { const tx = newsText(n, lang); const region = regionText(n.region, lang); return (
        <li key={n.url} className="py-3 grid grid-cols-[4.5rem_1fr] sm:grid-cols-[6rem_1fr] gap-x-4">
          <time dateTime={n.publishedAt} className="text-xs text-ink-3 pt-0.5" title={fmtDate(n.publishedAt, lang)}>
            {n.publishedAt.length <= 10 ? fmtDate(n.publishedAt, lang) : fmtAgo(n.publishedAt, lang)}
          </time>
          <div className="min-w-0">
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-gold hover:underline underline-offset-2 leading-snug">
              {tx.title}
            </a>
            {tx.summary && <p className="mt-1 text-sm text-ink-2 max-w-[75ch]">{tx.summary}</p>}
            <p className="mt-1 text-xs text-ink-3">
              {n.source}
              {region && <span className="ml-2">{region}</span>}
              {n.topics.length > 0 && <span className="ml-2">{n.topics.map(tp => t.news.topics[tp]).join(', ')}</span>}
            </p>
          </div>
        </li>
      ); })}
    </ol>
  );
}
