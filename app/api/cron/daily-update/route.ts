// app/api/cron/daily-update/route.ts — ежедневный снимок котировок и спредов (Vercel Cron).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { getQuotesFresh } from '@/lib/quotes';
import { saveSnapshot } from '@/lib/snapshots';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const quotes = await getQuotesFresh();
  if (quotes.error) return NextResponse.json({ success: false, error: quotes.error }, { status: 502 });

  const { saved, error } = await saveSnapshot(quotes);
  return NextResponse.json(
    {
      success: !error,
      saved,
      error,
      missing: quotes.quotes.filter(q => q.price == null).map(q => q.id),
      tickers: Object.fromEntries(quotes.quotes.map(q => [q.id, q.ticker])),
    },
    { status: error ? 500 : 200 }
  );
}
