// app/api/cron/telegram-digest/route.ts — SIMPLE & WORKING
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
    
    let message = `🌴 <b>Oils Terminal — News</b>\n📅 ${today}\n\n`;
    
    // 🔹 Простой запрос к твоему /api/news
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://oils-terminal.vercel.app';
    
    const res = await fetch(`${baseUrl}/api/news?limit=10`);
    
    if (!res.ok) {
      message += `❌ Не удалось загрузить новости (HTTP ${res.status})\n\n`;
    } else {
      const data = await res.json();
      
      // 🔹 Пробуем разные возможные поля — просто и надёжно
      const articles = 
        data?.articles || 
        data?.news || 
        data?.items || 
        data?.data || 
        (Array.isArray(data) ? data : []);
      
      if (articles.length === 0) {
        message += `ℹ️ Новостей пока нет\n\n`;
      } else {
        message += `<b>📰 Свежие новости:</b>\n\n`;
        
        for (const item of articles.slice(0, 10)) {
          // Берём заголовок из любого возможного поля
          const title = 
            item?.title || 
            item?.headline || 
            item?.name || 
            item?.subject || 
            JSON.stringify(item).slice(0, 50);
          
          // Источник
          const source = 
            item?.source || 
            item?.publisher || 
            item?.site || 
            item?.author || 
            'Источник';
          
          // Ссылка
          const link = 
            item?.url || 
            item?.link || 
            item?.sourceUrl || 
            item?.permalink || 
            baseUrl;
          
          // Короткий заголовок
          const short = title.length > 55 ? title.slice(0, 52) + '...' : title;
          
          message += `🔹 ${short}\n`;
          message += `   <i>${source}</i>\n`;
          message += `   <a href="${link}">Читать</a>\n\n`;
        }
      }
    }
    
    message += `🔗 <a href="${baseUrl}">Открыть терминал</a>`;
    
    const sent = await sendTelegramMessage(message);
    
    return NextResponse.json({ 
      success: sent, 
      timestamp: new Date().toISOString() 
    });
    
  } catch (err: any) {
    console.error('💥 Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
