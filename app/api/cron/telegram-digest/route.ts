// app/api/cron/telegram-digest/route.ts — FINAL DIRECT DB VERSION
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

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
    
    // 🔹 Прямой запрос к базе (в обход /api/news)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: newsItems, error } = await supabase
      .from('news')
      .select('title, source, url, published_at')
      .order('published_at', { ascending: false })
      .limit(10);
    
    if (error || !newsItems || newsItems.length === 0) {
      message += `ℹ️ Новостей пока нет\n\n`;
    } else {
      message += `<b>📰 Свежие новости:</b>\n\n`;
      
      for (const item of newsItems) {
        const title = item.title?.length > 55 ? item.title.slice(0, 52) + '...' : item.title || 'Без заголовка';
        const source = item.source || 'Источник';
        const link = item.url || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oils-terminal.vercel.app';
        
        message += `🔹 ${title}\n`;
        message += `   <i>${source}</i>\n`;
        message += `   <a href="${link}">Читать</a>\n\n`;
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
