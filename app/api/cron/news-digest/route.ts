// app/api/cron/telegram-digest/route.ts
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { fetchFilteredNews } from '@/lib/news-parser'; // ← ИМПОРТ ТУ ЖЕ ФУНКЦИЮ

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // ... авторизация (без изменений) ...
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const queryKey = url.searchParams.get('key');
  const expected = (process.env.CRON_SECRET || '').trim();
  const received = authHeader.replace('Bearer ', '').trim();
  const isAuthorized = (received && received === expected) || (queryKey && queryKey === expected);
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    let message = `🌴 <b>Oils Terminal — News</b>\n📅 ${today}\n\n`;
    
    // 🔹 Берём новости через общую функцию (никаких 401!)
    const news = await fetchFilteredNews(10);
    
    if (news.length === 0) {
      message += `ℹ️ Новостей за неделю не найдено\n\n`;
    } else {
      message += `<b>📰 Свежие новости:</b>\n\n`;
      for (const item of news) {
        const short = item.title.length > 55 ? item.title.slice(0, 52) + '...' : item.title;
        message += `🔹 ${short}\n`;
        message += `   <i>${item.source}</i>\n`;
        message += `   <a href="${item.url}">Читать</a>\n\n`;
      }
    }
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://oils-terminal.vercel.app';
    message += `🔗 <a href="${baseUrl}">Открыть терминал</a>`;
    
    const sent = await sendTelegramMessage(message);
    return NextResponse.json({ success: sent, timestamp: new Date().toISOString() });
    
  } catch (err: any) {
    console.error('💥 Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
