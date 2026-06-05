import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });
  }

  try {
    // Пробуем MPOC
    const url = 'https://mpoc.org.my/feed/';
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store' 
    });

    if (!res.ok) {
      return new NextResponse(JSON.stringify({ error: `FETCH FAILED: ${res.status}` }), { status: 500 });
    }

    const text = await res.text();
    
    // Более гибкий парсинг: ищем просто теги <title> и <link> внутри <item>
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(text)) !== null) {
      const content = itemMatch[1];
      
      // Ищем заголовок (с CDATA или без)
      const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      // Ищем ссылку
      const linkMatch = content.match(/<link>(.*?)<\/link>/);
      
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1].trim(),
          link: linkMatch[1].trim()
        });
      }
    }

    if (items.length === 0) {
      // Если не нашли items, вернем кусок текста для отладки
      return new NextResponse(JSON.stringify({ 
        error: "NO ITEMS PARSED", 
        preview: text.substring(0, 500) 
      }), { status: 500 });
    }

    // Формируем сообщение для Telegram
    let msg = "📰 <b>News Digest (MPOC)</b>\n\n";
    for (let i = 0; i < Math.min(5, items.length); i++) {
      msg += `<b>${i+1}. ${items[i].title}</b>\n<a href="${items[i].link}">Link</a>\n\n`;
    }

    // Отправляем
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML'
      })
    });

    if (!tgRes.ok) {
      return new NextResponse(JSON.stringify({ error: "TG FAILED" }), { status: 500 });
    }

    return new NextResponse(JSON.stringify({ success: true, count: items.length }), {
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (e) {
    return new NextResponse(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
