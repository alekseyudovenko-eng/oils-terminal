import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// URL твоего сайта (замени на свой домен, если есть, или оставь vercel.app)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://oils-terminal.vercel.app';

export async function GET() {
  // Простая защита: проверяем секретный ключ из заголовка (опционально, но рекомендуется)
  // const authHeader = headers().get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }

  try {
    // Забираем новости из нашего же API
    const res = await fetch(`${SITE_URL}/api/news`);
    if (!res.ok) throw new Error('Failed to fetch news');
    
    const data = await res.json();
    const top5 = data.news.slice(0, 5);

    if (top5.length === 0) return NextResponse.json({ message: 'No news found' });

    let msg = "📰 <b>Morning News Digest</b>\n\n";
    top5.forEach((n: any, i: number) => {
      // Обрезаем слишком длинные заголовки
      const title = n.title.length > 100 ? n.title.substring(0, 97) + '...' : n.title;
      msg += `${i+1}. <a href="${n.url}">${title}</a>\n`;
    });
    msg += `\n<i>Source: Oils Terminal Aggregator</i>`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: msg, 
        parse_mode: 'HTML', 
        disable_web_page_preview: true 
      })
    });

    if (!tgRes.ok) throw new Error('Telegram API Error');

    return NextResponse.json({ success: true, sent: top5.length });
  } catch (e) {
    console.error("Cron News Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
