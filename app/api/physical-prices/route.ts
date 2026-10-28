// /api/physical-prices?key=<CRON_SECRET>&days=14 — таблица физических цен для еженедельного и
// ежемесячного отчётов (задачи по расписанию читают её через WebFetch). Не публичная: нужен ключ.
// Ответ — короткий текст: по строке на продукт, цены по датам.
import { isCronAuthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { PHYSICAL_SOURCE, PHYSICAL_URL } from '@/lib/physical';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response('Unauthorized', { status: 401 });
  const db = getDb();
  if (!db) return new Response('Supabase не настроен', { status: 500 });
  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days') || 14), 1), 400);
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from('physical_prices')
    .select('day,product,price_usd,change_usd').gte('day', since).order('day').order('product');
  if (error) return new Response(error.message, { status: 500 });

  const rows = (data || []) as { day: string; product: string; price_usd: number | null; change_usd: number | null }[];
  const dates = Array.from(new Set(rows.map(r => r.day))).sort();
  const products = Array.from(new Set(rows.map(r => r.product)));
  const cell = (p: string, d: string) => {
    const r = rows.find(x => x.product === p && x.day === d);
    return r?.price_usd == null ? '' : String(Number(r.price_usd));
  };
  const lines = [
    `# Physical palm product prices, FOB, USD/t (bulk), daily close. Source: ${PHYSICAL_SOURCE} (${PHYSICAL_URL}).`,
    '# Internal use in IMA reports only; cite the source. Empty cell = no price that day.',
    ['product', ...dates].join('\t'),
    ...products.map(p => [p, ...dates.map(d => cell(p, d))].join('\t')),
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
