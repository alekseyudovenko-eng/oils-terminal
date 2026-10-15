// app/api/cron/news-digest/route.ts — единственный новостной дайджест в Telegram (Vercel Cron)
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram';
import { fetchFilteredNews } from '@/lib/news-parser';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://oils-terminal.vercel.app';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toLocaleDateString('ru-RU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });

    let message = `🌴 <b>Oils Terminal — News</b>\n📅 ${today}\n\n`;
    const news = await fetchFilteredNews(10);

    if (news.length === 0) {
      message += 'ℹ️ Новостей за неделю не найдено\n\n';
    } else {
      message += '<b>📰 Свежие новости:</b>\n\n';
      for (const item of news) {
        const short = item.title.length > 80 ? item.title.slice(0, 77) + '...' : item.title;
        message += `🔹 ${escapeHtml(short)}\n`;
        message += `   <i>${escapeHtml(item.source)}</i> · <a href="${escapeHtml(item.url)}">Читать</a>\n\n`;
      }
    }

    // VERCEL_URL указывает на конкретный деплой, а не на сайт, поэтому используем постоянный адрес.
    message += `🔗 <a href="${escapeHtml(SITE_URL)}">Открыть терминал</a>`;

    const sent = await sendTelegramMessage(message);
    return NextResponse.json(
      { success: sent, items: news.length, timestamp: new Date().toISOString() },
      { status: sent ? 200 : 502 }
    );
  } catch (err: any) {
    console.error('news-digest error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
