// app/api/cron/telegram-digest/route.ts — DEBUG NEWS VERSION
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
    
    // 🔹 Простой запрос к /api/news
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://oils-terminal.vercel.app';
    
    const newsUrl = `${baseUrl}/api/news?limit=10`;
    message += `<i>🔍 Запрос: ${newsUrl}</i>\n\n`;
    
    try {
      const res = await fetch(newsUrl, { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 0 } // без кэша для теста
      });
      
      message += `<i>📡 HTTP статус: ${res.status} ${res.statusText}</i>\n\n`;
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'no body');
        message += `<b>❌ Ошибка ответа:</b>\n\`\`\`${errorText.slice(0, 300)}\`\`\`\n\n`;
      } else {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          message += `<b>❌ Не JSON:</b>\n\`\`\`${text.slice(0, 300)}\`\`\`\n\n`;
          data = null;
        }
        
        if (data) {
          // Пробуем разные возможные поля
          const articles = 
            data.articles || 
            data.news || 
            data.items || 
            data.data || 
            (Array.isArray(data) ? data : null);
          
          message += `<i>📦 Структура ответа:</i>\n\`\`\`${JSON.stringify(Object.keys(data)).slice(0, 200)}\`\`\`\n\n`;
          
          if (articles && articles.length > 0) {
            message += `<b>📰 Найдено новостей: ${articles.length}</b>\n\n`;
            for (const item of articles.slice(0, 5)) {
              const title = item.title || item.headline || item.name || JSON.stringify(item).slice(0, 50);
              const source = item.source || item.publisher || item.site || 'N/A';
              const link = item.url || item.link || item.sourceUrl || '#';
              const short = title.length > 50 ? title.slice(0, 47) + '...' : title;
              message += `🔹 ${short}\n   <i>${source}</i>\n   <a href="${link}">Читать</a>\n\n`;
            }
          } else {
            message += `<b>⚠️ Массив новостей пуст или не найден</b>\n`;
            message += `<i>Доступные ключи:</i> ${Object.keys(data).join(', ')}\n\n`;
          }
        }
      }
    } catch (fetchErr: any) {
      message += `<b>❌ Ошибка fetch:</b>\n\`\`\`${fetchErr.message || fetchErr}\`\`\`\n\n`;
    }
    
    message += `🔗 <a href="${baseUrl}">Открыть терминал</a>`;
    
    const sent = await sendTelegramMessage(message);
    return NextResponse.json({ success: sent, timestamp: new Date().toISOString() });
    
  } catch (err: any) {
    console.error('💥 Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
