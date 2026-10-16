// app/api/cron/usda-sync/route.ts — ежемесячная загрузка балансов USDA PSD (Vercel Cron).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { syncPsd } from '@/lib/psd';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const report = await syncPsd();
    const ok = report.rows > 0;
    return NextResponse.json({ success: ok, ...report, errors: report.errors.slice(0, 20) }, { status: ok ? 200 : 502 });
  } catch (e: any) {
    console.error('usda-sync error:', e);
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
