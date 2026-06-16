// app/api/cron/telegram-digest/route.ts — FINAL VERSION
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// 🔹 Форматирование названия товара
function formatCommodity(c: string): string {
  const map: Record<string, string> = {
    palm: '🌴 Palm',
    soybean: '🫘 Soy',
    sunflower: '🌻 Sun',
    rapeseed: '🌼 Rape'
  };
  return map[c] || c;
}

// 🔹 Форматирование метрики
function formatMetric(m: string): string {
  const map: Record<string, string> = {
    production: 'Prod',
    consumption: 'Cons',
    exports: 'Exp',
    imports: 'Imp',
    ending_stocks: 'Stocks'
  };
  return map[m] || m;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const queryKey = url.searchParams.get('key');
  const expected = (process.env.CRON_SECRET || '').trim();
  const received = authHeader.replace('Bearer ', '').trim();
  
  const isAuthorized = (received && received === expected) || (queryKey && queryKey === expected);
  
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      debug: true,
      expected: expected ? `${expected.slice(0,3)}***${expected.slice(-3)}` : 'NOT SET',
      match: received === expected || queryKey === expected
    });
  }
  
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    let message = `🌴 <b>Oils Terminal — Daily Digest</b>\n📅 ${today}\n\n`;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 🔹 1. РЕАЛЬНЫЕ МЕТРИКИ ИЗ БАЗЫ (гибкий запрос)
    try {
      const { data: balanceData } = await supabase
        .from('balance_sheet')
        .select('commodity, metric, value, period')
        .in('commodity', ['palm', 'soybean', 'sunflower', 'rapeseed'])
        .order('period', { ascending: false })
        .limit(50);
      
      if (balanceData && balanceData.length > 0) {
        // Группируем по товару
        const byCommodity = balanceData.reduce((acc: any, item: any) => {
          if (!acc[item.commodity]) acc[item.commodity] = [];
          acc[item.commodity].push(item);
          return acc;
        }, {});
        
        message += `<b>📊 Balance Highlights:</b>\n`;
        for (const [comm, items] of Object.entries(byCommodity) as [string, any[]][]) {
          // Берём самую свежую запись для этого товара
          const latest = items[0];
          if (!latest) continue;
          
          // Пытаемся найти предыдущую запись той же метрики для расчёта дельты
          const prev = items.find((i: any) => i.metric === latest.metric && i.period !== latest.period);
          const change = prev ? ((latest.value - prev.value) / prev.value * 100).toFixed(1) : '0';
          
          const arrow = parseFloat(change) >= 0 ? '🟢' : '🔴';
          const sign = parseFloat(change) >= 0 ? '+' : '';
          message += `${arrow} ${formatCommodity(comm)} ${formatMetric(latest.metric)}: <b>${formatNum(latest.value)}</b> (${sign}${change}%)\n`;
        }
        message += `\n`;
      }
    } catch (e) {
      console.error('❌ Metrics fetch failed:', e);
    }
    
    // 🔹 2. РЕАЛЬНЫЕ ЦЕНЫ ИЗ MARKET_PRICES
    try {
      const { data: prices } = await supabase
        .from('market_prices')
        .select('symbol, price, currency, change_pct, source')
        .order('timestamp', { ascending: false })
        .limit(4);
      
      if (prices && prices.length > 0) {
        message += `<b>💰 Live Prices:</b>\n`;
        for (const p of prices) {
          const arrow = (p.change_pct || 0) >= 0 ? '🟢' : '🔴';
          const sign = (p.change_pct || 0) >= 0 ? '+' : '';
          const unit = p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : '';
          message += `${arrow} ${p.symbol}: <b>${unit}${p.price.toLocaleString()}</b> (${sign}${p.change_pct?.toFixed(2)}%)\n`;
        }
        message += `\n`;
      }
    } catch (e) {
      console.error('❌ Prices fetch failed:', e);
    }
    
    // 🔹 3. РЕАЛЬНЫЕ НОВОСТИ ИЗ /api/news
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'https://oils-terminal.vercel.app';
      
      const newsRes = await fetch(`${baseUrl}/api/news?limit=3`, { next: { revalidate: 3600 } });
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const articles = newsData.articles || newsData.news || [];
        
        if (articles.length > 0) {
          message += `<b>📰 Latest News:</b>\n`;
          for (const article of articles.slice(0, 3)) {
            const title = article.title || article.headline || 'No title';
            const source = article.source || article.publisher || 'Unknown';
            // Обрезаем длинные заголовки
            const shortTitle = title.length > 50 ? title.slice(0, 47) + '...' : title;
            message += `• ${shortTitle} (${source})\n`;
          }
          message += `\n`;
        }
      }
    } catch (e) {
      console.error('❌ News fetch failed:', e);
      // Фоллбэк: если новости не загрузились, не показываем блок вообще
    }
    
    // 🔗 Ссылка на терминал (динамическая)
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://oils-terminal.vercel.app';
    message += `🔗 <a href="${baseUrl}">Открыть терминал</a>`;
    
    const sent = await sendTelegramMessage(message);
    
    return NextResponse.json({ 
      success: sent, 
      message: sent ? 'Digest sent' : 'Failed to send',
      timestamp: new Date().toISOString()
    });
    
  } catch (err: any) {
    console.error('💥 Telegram cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
