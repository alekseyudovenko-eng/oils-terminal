import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Простая функция для извлечения тегов из XML
function extractTagContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let content = match[1].replace(/<!\[CDATA\[(.*)\]\]>/g, '$1');
    // Декодируем HTML entities (&amp; -> &)
    content = content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    matches.push(content.trim());
  }
  return matches;
}

export async function GET() {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: "Config missing" }, { status: 500 });
  }

  try {
    // Забираем RSS APK-Inform (самый стабильный источник)
    const res = await fetch('https://www.apk-inform.com/ru/news/rss', {
      headers: { 'User-Agent': 'OilsTerminalBot/1.0' }
    });

    if (!res.ok) throw new Error(`APK Status: ${res.status}`);
    
    const xmlText = await res.text();

    // Парсим заголовки, ссылки и описания
    const titles = extractTagContent(xmlText, 'title');
    const links = extractTagContent(xmlText, 'link');
    const descs = extractTagContent(xmlText, 'description');

    // Пропускаем первый элемент (заголовок канала) и берем топ-5
    let msg = "📰 <b>Morning News Digest</b>\n";
    msg += `🗓 ${new Date().toLocaleDateString('ru-RU')}\n\n`;

    let count = 0;
    for (let i = 1; i < titles.length; i++) {
      if (count >= 5) break;
      if (!links[i]) continue;

      const title = titles[i];
      const link = links[i];
      // Берем описание, если оно есть и не слишком длинное
      const desc = descs[i] && descs[i] !== "Новость от АПК-Информ" ? `\n   _${descs[i].substring(0, 150)}..._` : "";

      msg += `<b>${count + 1}. ${title}</b>${desc}\n🔗 <a href="${link}">Читать далее</a>\n\n`;
      count++;
    }

    msg += `<i>Source: Oils Terminal Aggregator</i>`;

    // Отправляем сообщение
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: msg, 
        parse_mode: 'HTML', 
        disable_web_page_preview: false // Включаем превью, если сайт его поддерживает
      })
    });

    if (!tgRes.ok) {
      const errData = await tgRes.json();
      throw new Error(`TG Error: ${JSON.stringify(errData)}`);
    }

    return NextResponse.json({ success: true, sent: count });

  } catch (e) {
    console.error("Cron News Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
