import Marquee from './Marquee';
import { fmtAgo } from '@/lib/format';
import type { NewsItem } from '@/lib/news';

export default function NewsTicker({ news }: { news: NewsItem[] }) {
  const items = news.slice(0, 25);
  if (items.length === 0) return null;
  return (
    <Marquee label="Последние новости" seconds={items.length * 9} className="bg-band text-band-text border-t border-white/10">
      {items.map(n => (
        <a
          key={n.url}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-baseline gap-2 px-5 py-2 text-sm whitespace-nowrap border-r border-white/10 hover:text-white"
        >
          <span className="text-band-muted">{fmtAgo(n.publishedAt)}</span>
          <span>{n.title}</span>
          <span className="text-band-muted">{n.source}</span>
        </a>
      ))}
    </Marquee>
  );
}
