// app/api/cron/market-report/route.ts — ежедневная сводка котировок в Telegram (Vercel Cron).
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { getQuotesFresh } from '@/lib/quotes';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { fmtPct, fmtPrice, fmtSigned } from '@/lib/format';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://imaoils.vercel.app';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quotes, spreads, error } = await getQuotesFresh();
  if (error) return NextResponse.json({ success: false, error }, { status: 502 });

  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  let msg = `🛢️ <b>Oils Terminal — рынок</b>\n📅 ${date}\n\n`;

  for (const q of quotes.filter(x => x.price != null && x.group !== 'fx')) {
    const usd = q.usdT != null && q.unit !== 'USD/т' ? ` ($${fmtPrice(q.usdT)}/т)` : '';
    msg += `• <b>${escapeHtml(q.short)}</b>: ${fmtPrice(q.price)} ${escapeHtml(q.unit)}${usd}  ${fmtPct(q.changePct)}\n`;
  }

  const shown = spreads.filter(s => s.value != null);
  if (shown.length) {
    msg += '\n<b>Спреды, USD/т</b>\n';
    for (const s of shown) {
      msg += `• <b>${escapeHtml(s.name)}</b>: ${fmtSigned(s.value)} (за день ${fmtSigned(s.change)})${s.proxy ? ' *' : ''}\n`;
    }
    if (shown.some(s => s.proxy)) msg += '<i>* газойль оценён по ULSD NYMEX</i>\n';
  }

  msg += `\n🔗 <a href="${escapeHtml(SITE_URL)}">Открыть терминал</a>`;
  const sent = await sendTelegramMessage(msg);
  return NextResponse.json({ success: sent }, { status: sent ? 200 : 502 });
}
