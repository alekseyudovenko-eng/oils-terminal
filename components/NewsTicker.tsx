import Marquee from './Marquee';
import { fmtAgo, fmtDate } from '@/lib/format';
import type { NewsItem } from '@/lib/news';
import { getDict } from '@/lib/i18n-server';
import { newsText } from '@/lib/news-i18n';

export default function NewsTicker({ news }: { news: NewsItem[] }) {
  const { lang, t } = getDict();
  const items = news.slice(0, 25);
  if (items.length === 0) return null;
  return (
    <Marquee label={t.news.ticker} seconds={items.length * 9} className="bg-band text-band-text border-t border-white/10">
      {items.map(n => (
        <a
          key={n.url}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-baseline gap-2 px-5 py-2 text-sm whitespace-nowrap border-r border-white/10 hover:text-white"
        >
          <span className="text-band-muted">{n.publishedAt.length <= 10 ? fmtDate(n.publishedAt, lang) : fmtAgo(n.publishedAt, lang)}</span>
          <span>{newsText(n, lang).title}</span>
          <span className="text-band-muted">{n.source}</span>
        </a>
      ))}
    </Marquee>
  );
}
