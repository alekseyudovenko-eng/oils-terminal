// /sitemap.xml — публичные страницы на всех языках со ссылками hreflang друг на друга.
import type { MetadataRoute } from 'next';
import { LOCALES, PUBLIC_PATHS, localePath } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import { CHART_IDS } from '@/lib/chart-ids';
import { getAllCuratedNews } from '@/lib/news';
import { newsSlug } from '@/lib/news-slug';
import { getArticles } from '@/lib/analytics';

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths: { path: string; priority: number; lastModified?: Date; freq: 'daily' | 'weekly' | 'monthly' }[] = [
    ...PUBLIC_PATHS.map(p => ({ path: p as string, priority: p === '/' ? 1 : 0.8, freq: 'daily' as const })),
    ...CHART_IDS.map(id => ({ path: `/chart/${id}`, priority: 0.7, freq: 'daily' as const })),
    ...getArticles().map(a => ({ path: `/analytics/${a.slug}`, priority: 0.7, lastModified: new Date(a.date), freq: 'monthly' as const })),
    ...getAllCuratedNews().map(n => ({ path: `/news/${newsSlug(n)}`, priority: 0.5, lastModified: new Date(n.publishedAt), freq: 'weekly' as const })),
  ];
  return paths.flatMap(({ path, priority, lastModified, freq }) => {
    const languages = Object.fromEntries(LOCALES.map(l => [l, SITE_URL + localePath(l, path)]));
    return LOCALES.map(lang => ({
      url: SITE_URL + localePath(lang, path),
      lastModified: lastModified ?? now,
      changeFrequency: freq,
      priority,
      alternates: { languages },
    }));
  });
}
