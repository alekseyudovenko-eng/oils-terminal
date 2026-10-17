// app/api/cron/market-report/route.ts — итоги недели по котировкам в Telegram (раз в неделю, суббота).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { alreadySentToday, caller, markSentToday } from '@/lib/once-a-day';
import { getQuotesFresh } from '@/lib/quotes';
import { valueDaysAgo } from '@/lib/snapshots';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { fmtPct, fmtPrice, fmtSigned } from '@/lib/format';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://imaoils.vercel.app';

export async function GET(request: Request) {
  const via = caller(request);
  if (!isCronAuthorized(request)) {
    console.warn('market-report: unauthorized call from', via);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get('force') === '1';
  if (!force && (await alreadySentToday('market-report'))) {
    console.log('market-report: already sent today, skipped; caller', via);
    return NextResponse.json({ success: true, skipped: 'already sent today' });
  }

  const { quotes, spreads, error } = await getQuotesFresh();
  if (error) return NextResponse.json({ success: false, error }, { status: 502 });

  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  let msg = `🛢️ <b>Oils Terminal — итоги недели</b>\n📅 ${date}\n\n`;

  for (const q of quotes.filter(x => x.price != null && x.group !== 'fx')) {
    const usd = q.usdT != null && q.unit !== 'USD/т' ? ` ($${fmtPrice(q.usdT)}/т)` : '';
    msg += `• <b>${escapeHtml(q.short)}</b>: ${fmtPrice(q.price)} ${escapeHtml(q.unit)}${usd}  ${fmtPct(q.perfW)} за неделю\n`;
  }

  const shown = spreads.filter(s => s.value != null);
  if (shown.length) {
    msg += '\n<b>Спреды, USD/т</b>\n';
    for (const s of shown) {
      const weekAgo = await valueDaysAgo(s.id, 7);
      const ch = weekAgo != null && s.value != null ? ` (за неделю ${fmtSigned(s.value - weekAgo)})` : '';
      msg += `• <b>${escapeHtml(s.name)}</b>: ${fmtSigned(s.value)}${ch}${s.proxy ? ' *' : ''}\n`;
    }
    if (shown.some(s => s.proxy)) msg += '<i>* газойль оценён по ULSD NYMEX</i>\n';
  }

  msg += `\n🔗 <a href="${escapeHtml(SITE_URL)}">Открыть терминал</a>`;
  const sent = await sendTelegramMessage(msg);
  if (sent) await markSentToday('market-report', via);
  console.log('market-report: sent =', sent, 'caller', via);
  return NextResponse.json({ success: sent }, { status: sent ? 200 : 502 });
}
