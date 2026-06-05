import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });
  }

  // АВТОМАТИЧЕСКИ ОПРЕДЕЛЯЕМ АДРЕС САЙТА
  const headersList = headers();
  const host = headersList.get('host');
  const proto = headersList.get('x-forwarded-proto') || 'https';
  const siteUrl = `${proto}://${host}`;

  try {
    // БЕРЕМ НОВОСТИ С ТЕКУЩЕГО ДЕПЛОЯ
    const res = await fetch(`${siteUrl}/api/news`, { cache: 'no-store' });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const data = await res.json();
    const news = data.news?.slice(0, 5) || [];

    if (news.length === 0) throw new Error("No news");

    let msg = `📰 <b>Сводка Oils Terminal</b>\n🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;

    news.forEach((item: any) => {
      msg += `🔹 <b>${item.title.replace(/&amp;/g, '&')}</b>\n🔗 <a href="${item.url}">Link</a>\n\n`;
    });

    // ОТПРАВКА В TELEGRAM
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML'
      })
    });

    return new NextResponse(JSON.stringify({ success: true, url: siteUrl }), {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (e) {
    return new NextResponse(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
