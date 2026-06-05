import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  // Ссылка на твой ТЕКУЩИЙ рабочий деплой
  const MY_SITE_URL = 'https://oils-terminal-5gho-h5nrizgm8-aleksey-udovenkos-projects.vercel.app';

  if (!token || !chatId) {
    return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });
  }

  try {
    // 1. Забираем новости с твоего же сайта (гарантия идентичности)
    const res = await fetch(`${MY_SITE_URL}/api/news`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return new NextResponse(JSON.stringify({ error: "Failed to fetch from site API" }), { status: 500 });
    }

    const data = await res.json();
    const news = data.news.slice(0, 5); // Берем топ-5

    if (!news || news.length === 0) {
      return new NextResponse(JSON.stringify({ error: "No news on site" }), { status: 500 });
    }

    // 2. Формируем красивую рассылку
    let msg = `📰 <b>Сводка за 24 часа</b>\n`;
    msg += `🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;

    for (const item of news) {
      // Очищаем заголовок от лишних символов
      const title = item.title.replace(/&amp;/g, '&');
      msg += `🔹 <b>${title}</b>\n`;
      msg += `🔗 <a href="${item.url}">Источник</a>\n\n`;
    }

    msg += `<i>Oils Terminal News</i>`;

    // 3. Отправляем в Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    if (!tgRes.ok) {
      const err = await tgRes.json();
      return new NextResponse(JSON.stringify({ error: "Telegram Error", details: err }), { status: 500 });
    }

    return new NextResponse(JSON.stringify({ success: true, sent: news.length }), {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (e) {
    return new NextResponse(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
