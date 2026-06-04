import { NextResponse } from 'next/server';

export async function GET() {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT = process.env.TELEGRAM_CHAT_ID;

  // 1. Проверка наличия токенов
  if (!TOKEN || !CHAT) {
    return NextResponse.json({ error: "STEP 1 FAILED: Missing Telegram Config" }, { status: 500 });
  }

  try {
    // 2. Попытка скачать RSS
    const rssUrl = 'https://www.apk-inform.com/ru/news/rss';
    const res = await fetch(rssUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store' // Отключаем кэш для теста
    });

    if (!res.ok) {
      return NextResponse.json({ 
        error: "STEP 2 FAILED: Could not fetch RSS", 
        status: res.status, 
        url: rssUrl 
      }, { status: 500 });
    }

    const xmlText = await res.text();
    
    // Простая проверка, что мы получили хоть какой-то XML
    if (!xmlText.includes('<item>')) {
      return NextResponse.json({ error: "STEP 3 FAILED: RSS contains no items" }, { status: 500 });
    }

    // 3. Парсинг (берем первый заголовок для теста)
    const titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = xmlText.match(/<link>(.*?)<\/link>/);

    if (!titleMatch || !linkMatch) {
       return NextResponse.json({ error: "STEP 4 FAILED: Regex parsing failed" }, { status: 500 });
    }

    const title = titleMatch[1];
    const link = linkMatch[1];

    // 4. Отправка в Telegram
    const msg = `🧪 <b>Test Success!</b>\n\nFirst news: ${title}\nLink: ${link}`;
    
    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: 'HTML' })
    });

    if (!tgRes.ok) {
      const tgErr = await tgRes.json();
      return NextResponse.json({ error: "STEP 5 FAILED: Telegram Error", details: tgErr }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "All steps passed!" });

  } catch (e) {
    return NextResponse.json({ error: "CRITICAL ERROR", details: String(e) }, { status: 500 });
  }
}
