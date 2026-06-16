// app/api/cron/telegram-digest/route.ts — SIMPLE NEWS ONLY
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    
    let message = `🌴 <b>Oils Terminal — News Digest</b>\n📅 ${today}\n\n`;
    
    // 🔹 ПРОСТО берём новости из твоего /api/news
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://oils-terminal.vercel.app';
    
    const res = await fetch(`${baseUrl}/api/news?limit=10`, { 
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 } // кэш на 30 мин
    });
    
    if (res.ok) {
      const data = await res.json();
      const articles = data.articles || data.news || data.items || [];
      
      if (articles.length > 0) {
        message += `<b>📰 Свежие новости:</b>\n\n`;
        for (const item of articles.slice(0, 10)) {
          const title = item.title || item.headline || item.name || 'Без заголовка';
          const source = item.source || item.publisher || item.site || 'Источник';
          const link = item.url || item.link || item.sourceUrl || baseUrl;
          // Короткий заголовок + эмодзи + ссылка
          const short = title.length > 60 ? title.slice(0, 57) + '...' : title;
          message += `🔹 ${short}\n   <i>${source}</i>\n   <a href="${link}">Читать</a>\n\n`;
        }
      } else {
        message += `<i>Новостей пока нет</i>\n\n`;
      }
    } else {
      message += `<i>Не удалось загрузить новости</i>\n\n`;
    }
    
    message += `🔗 <a href="${baseUrl}">Открыть терминал</a>`;
    
    const sent = await sendTelegramMessage(message);
    return NextResponse.json({ success: sent, timestamp: new Date().toISOString() });
    
  } catch (err: any) {
    console.error('💥 Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
