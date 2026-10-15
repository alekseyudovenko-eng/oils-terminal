// app/api/cron/market-report/route.ts — ежедневный отчёт по ценам в Telegram (Vercel Cron)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isCronAuthorized } from '@/lib/auth';
import { escapeHtml, sendTelegramMessage, sendTelegramPhoto } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Все цены в USD/т: spot, futures и reference (раньше в отчёт попадал только spot).
    const { data: prices, error } = await supabase
      .from('market_data')
      .select('commodity, value, metric, verified_at')
      .like('metric', 'price_%')
      .order('commodity');
    if (error) throw error;

    const rows = (prices || []).filter((p: any) => Number(p.value) > 0);

    let msg = '🛢️ <b>Daily Market Report</b>\n';
    msg += `📅 ${new Date().toLocaleDateString('ru-RU', { timeZone: 'UTC' })}\n\n`;

    const labels: string[] = [];
    const values: number[] = [];
    for (const p of rows) {
      const value = Number(p.value);
      const date = p.verified_at ? new Date(p.verified_at).toLocaleDateString('ru-RU', { timeZone: 'UTC' }) : '';
      msg += `🔹 <b>${escapeHtml(p.commodity)}</b>: $${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
      msg += date ? ` <i>(${date})</i>\n` : '\n';
      labels.push(String(p.commodity).split('(')[0].trim().slice(0, 16));
      values.push(value);
    }

    if (values.length === 0) {
      msg += '⚠️ Нет данных о ценах.';
      const sent = await sendTelegramMessage(msg);
      return NextResponse.json({ success: sent, prices: 0 });
    }

    // График через QuickChart: конфиг кодируется, чтобы названия с пробелами и скобками не ломали URL.
    const chartConfig = {
      type: 'bar',
      data: { labels, datasets: [{ label: 'USD/MT', data: values, backgroundColor: '#3b82f6' }] },
      options: { legend: { display: false } },
    };
    const photoUrl = `https://quickchart.io/chart?w=600&h=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    let sent = await sendTelegramPhoto(photoUrl, msg);
    if (!sent) sent = await sendTelegramMessage(msg); // если фото не прошло — хотя бы текст

    return NextResponse.json({ success: sent, prices: values.length }, { status: sent ? 200 : 502 });
  } catch (e: any) {
    console.error('market-report error:', e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
