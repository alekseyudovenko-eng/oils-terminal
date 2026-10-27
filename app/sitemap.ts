// /sitemap.xml — публичные страницы на всех языках со ссылками hreflang друг на друга.
import type { MetadataRoute } from 'next';
import { LOCALES, PUBLIC_PATHS, localePath } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.flatMap(path => {
    const languages = Object.fromEntries(LOCALES.map(l => [l, SITE_URL + localePath(l, path)]));
    return LOCALES.map(lang => ({
      url: SITE_URL + localePath(lang, path),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: path === '/' ? 1 : 0.8,
      alternates: { languages },
    }));
  });
}
