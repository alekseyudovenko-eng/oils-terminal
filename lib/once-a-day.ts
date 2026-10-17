// lib/once-a-day.ts — отметка «уже отправлено сегодня», чтобы рассылка не пришла дважды,
// если её запустят и Vercel по расписанию, и резервный запуск.
// Отметка хранится в таблице price_snapshots строкой с series = '_sent:<имя>' (отдельная таблица не нужна).
import { getDb } from './db';

const today = () => new Date().toISOString().slice(0, 10);

export async function alreadySentToday(job: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { data } = await db
    .from('price_snapshots')
    .select('day')
    .eq('day', today())
    .eq('series', `_sent:${job}`)
    .maybeSingle();
  return !!data;
}

export async function markSentToday(job: string, via: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.from('price_snapshots').upsert(
    { day: today(), series: `_sent:${job}`, price: null, usd_t: null, ticker: `${via}|${new Date().toISOString()}` },
    { onConflict: 'day,series' }
  );
}

/** Кто вызвал: Vercel Cron присылает свой User-Agent. */
export function caller(request: Request): string {
  const ua = request.headers.get('user-agent') || '';
  if (/vercel-cron/i.test(ua)) return 'vercel-cron';
  return new URL(request.url).searchParams.get('via') || 'manual';
}

/** Когда рассылка отправлялась в последний раз (точное время хранится в поле ticker: "кто|ISO-время"). */
export async function lastSentAt(job: string): Promise<Date | null> {
  const db = getDb();
  if (!db) return null;
  const { data } = await db
    .from('price_snapshots')
    .select('day, ticker')
    .eq('series', `_sent:${job}`)
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const iso = String(data.ticker || '').split('|')[1];
  const t = iso ? new Date(iso) : new Date(`${data.day}T23:59:59Z`);
  return isNaN(t.getTime()) ? null : t;
}
