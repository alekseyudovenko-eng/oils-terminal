import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Простая функция для извлечения тегов из XML
function extractTag(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    // Очищаем от CDATA если есть
    let content = match[1].replace(/<!\[CDATA\[(.*)\]\]>/g, '$1');
    matches.push(content);
  }
  return matches;
}

export async function GET() {
  try {
    // 1. Забираем XML напрямую с APK-Inform (самый надежный RSS)
    const res = await fetch('https://www.apk-inform.com/ru/news/rss', {
      headers: { 'User-Agent': 'OilsTerminalBot/1.0' }
    });

    if (!res.ok) throw new Error(`APK Status: ${res.status}`);
    
    const xmlText = await res.text();

    // 2. Парсим заголовки и ссылки вручную
    const titles = extractTag(xmlText, 'title');
    const links = extractTag(xmlText, 'link');
    
    // Пропускаем первый элемент (это заголовок канала)
    const newsItems = [];
    for (let i = 1; i < titles.length; i++) {
      if (links[i]) {
        newsItems.push({ title: titles[i], url: links[i] });
      }
    }

    // Берем топ-5
    const top5 = newsItems.slice(0, 5);

    if (top5.length === 0) throw new Error("No items parsed");

    // 3. Формируем сообщение
    let msg = "📰 <b>Morning News Digest (APK-Inform)</b>\n\n";
    top5.forEach((n, i) => {
      const cleanTitle = n.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<');
      msg += `${i+1}. <a href="${n.url}">${cleanTitle}</a>\n`;
    });
    msg += `\n<i>Source: Oils Terminal Aggregator</i>`;

    // 4. Отправляем в Telegram
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

    if (!tgRes.ok) {
      const errData = await tgRes.json();
      throw new Error(`TG Error: ${JSON.stringify(errData)}`);
    }

    return NextResponse.json({ success: true, sent: top5.length });

  } catch (e) {
    console.error("Cron News Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
