import { fmtDate, fmtAgo } from '@/lib/format';
import { TOPIC_LABELS, type NewsItem } from '@/lib/news';

export default function NewsList({ news, limit }: { news: NewsItem[]; limit?: number }) {
  const items = limit ? news.slice(0, limit) : news;
  if (items.length === 0) {
    return <p className="py-6 text-ink-2">Новостей за последний месяц не найдено. Источники проверяются каждые 30 минут.</p>;
  }
  return (
    <ol className="divide-y divide-rule">
      {items.map(n => (
        <li key={n.url} className="py-3 grid grid-cols-[4.5rem_1fr] sm:grid-cols-[6rem_1fr] gap-x-4">
          <time dateTime={n.publishedAt} className="text-xs text-ink-3 pt-0.5" title={fmtDate(n.publishedAt)}>
            {fmtAgo(n.publishedAt)}
          </time>
          <div className="min-w-0">
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-gold hover:underline underline-offset-2 leading-snug">
              {n.title}
            </a>
            {n.summary && <p className="mt-1 text-sm text-ink-2 line-clamp-2 max-w-[75ch]">{n.summary}</p>}
            <p className="mt-1 text-xs text-ink-3">
              {n.source}
              {n.topics.length > 0 && <span className="ml-2">{n.topics.map(t => TOPIC_LABELS[t]).join(', ')}</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
