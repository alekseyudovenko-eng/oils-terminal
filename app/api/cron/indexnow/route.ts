// /api/cron/indexnow — сообщает Яндексу и Bing о новых страницах (IndexNow).
// Vercel Cron каждый день: новости, добавленные за последние 30 часов (все языки), главные страницы и графики.
// ?all=1 — отправить все страницы из sitemap (первичная отправка). Доступ: CRON_SECRET.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { submitIndexNow } from '@/lib/indexnow';
import { SITE_URL } from '@/lib/site';
import { LOCALES, localePath } from '@/lib/i18n';
import { getRecentlyAdded } from '@/lib/news';
import { newsSlug } from '@/lib/news-slug';
import { CHART_IDS } from '@/lib/chart-ids';
import sitemap from '@/app/sitemap';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const all = new URL(request.url).searchParams.get('all') === '1';
  let urls: string[];
  if (all) {
    urls = sitemap().map(e => e.url);
  } else {
    const paths = ['/', '/market', '/analytics', ...CHART_IDS.map(id => `/chart/${id}`), ...getRecentlyAdded(30).map(n => `/news/${newsSlug(n)}`)];
    urls = paths.flatMap(p => LOCALES.map(l => SITE_URL + localePath(l, p)));
  }
  const result = await submitIndexNow(urls);
  return NextResponse.json({ success: Object.values(result).some(v => /^HTTP 20[02]/.test(v)), sent: urls.length, result });
}
