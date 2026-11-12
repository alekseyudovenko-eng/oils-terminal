// app/api/cron/usda-sync/route.ts — загрузка балансов USDA PSD после каждого отчёта WASDE (Vercel Cron).
// Cron запускается каждый день в 18:15 UTC, но загрузка идёт только в день выхода WASDE и на следующий день
// (даты — lib/market-calendar.ts; для месяцев без известной даты — 9–13 число). ?force=1 — загрузить сейчас.
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isCronAuthorized } from '@/lib/auth';
import { syncPsd } from '@/lib/psd';
import { isWasdeWindow } from '@/lib/market-calendar';
import { alreadySentToday, caller, markSentToday } from '@/lib/once-a-day';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get('force') === '1';
  if (!force && !isWasdeWindow()) return NextResponse.json({ success: true, skipped: 'not a WASDE day' });
  if (!force && (await alreadySentToday('usda-sync'))) return NextResponse.json({ success: true, skipped: 'already synced today' });
  try {
    const report = await syncPsd();
    const ok = report.rows > 0;
    if (ok) {
      await markSentToday('usda-sync', caller(request));
      revalidateTag('psd');
    }
    return NextResponse.json({ success: ok, ...report, errors: report.errors.slice(0, 20) }, { status: ok ? 200 : 502 });
  } catch (e: any) {
    console.error('usda-sync error:', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
