// /robots.txt — публичные страницы открыты, лаборатория и служебные API закрыты.
// /api/snapshot открыт: это картинка для превью ссылок (OpenGraph).
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/api/snapshot'], disallow: ['/lab', '/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
