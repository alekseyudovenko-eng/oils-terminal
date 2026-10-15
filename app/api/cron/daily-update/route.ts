// app/api/cron/daily-update/route.ts — ежедневное обновление цен (Vercel Cron)
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { updatePrices } from '@/lib/prices';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await updatePrices();
    const status = result.errors.length > 0 ? 500 : 200;
    return NextResponse.json({ success: status === 200, ...result }, { status });
  } catch (e: any) {
    console.error('daily-update error:', e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
