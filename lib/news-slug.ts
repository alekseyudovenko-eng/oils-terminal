// lib/news-slug.ts — постоянный адрес страницы новости: дата + короткий хэш ссылки на первоисточник.
import type { NewsItem } from './news';

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).padStart(6, '0').slice(-6);
}

export const newsSlug = (n: Pick<NewsItem, 'publishedAt' | 'url'>) => `${n.publishedAt.slice(0, 10)}-${hash(n.url)}`;
