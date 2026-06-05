import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Отключаем кэширование Next.js

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new NextResponse(JSON.stringify({ error: "NO TOKENS" }), { status: 500 });
  }

  try {
    // Берем MPOC, так как APK блочит 403. MPOC обычно открыт.
    const url = 'https://mpoc.org.my/feed/';
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store' 
    });

    if (!res.ok) {
      return new NextResponse(JSON.stringify({ error: `FETCH FAILED: ${res.status}` }), { status: 500 });
    }

    const text = await res.text();
    
    // Тупый парсинг XML
    const titles = [];
    const links = [];
    const regex = /<item>(.*?)<\/item>/gs;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const item = match[1];
      const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const l = item.match(/<link>(.*?)<\/link>/);
      if (t && l) {
        titles.push(t[1]);
        links.push(l[1]);
      }
    }

    if (titles.length === 0) {
      return new NextResponse(JSON.stringify({ error: "NO ITEMS PARSED" }), { status: 500 });
    }

    // Формируем текст
    let msg = "📰 <b>News Digest</b>\n\n";
    for (let i = 0; i < Math.min(5, titles.length); i++) {
      msg += `<b>${i+1}. ${titles[i]}</b>\n<a href="${links[i]}">Link</a>\n\n`;
    }

    // Шлем в телегу
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

    return new NextResponse(JSON.stringify({ success: true, count: titles.length }), {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });

  } catch (e) {
    return new NextResponse(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
