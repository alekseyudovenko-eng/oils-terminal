// app/api/cron/telegram-digest/route.ts — BULLETPROOF VERSION
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  // 🔍 Получаем ключ из заголовка ИЛИ из query param (для браузера)
  const authHeader = request.headers.get('authorization') || '';
  const queryKey = url.searchParams.get('key');
  const expected = (process.env.CRON_SECRET || '').trim();
  const received = authHeader.replace('Bearer ', '').trim();
  
  // Проверка: через заголовок ИЛИ через ?key=...
  const isAuthorized = 
    (received && received === expected) || 
    (queryKey && queryKey === expected);
  
  // 🔧 Режим отладки: покажет, что видит сервер
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json({
      debug: true,
      expected: expected ? `${expected.slice(0,3)}***${expected.slice(-3)}` : 'NOT SET',
      receivedHeader: authHeader || 'MISSING',
      queryKey: queryKey || 'NOT SENT',
      match: received === expected || queryKey === expected
    });
  }
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    let message = `🌴 <b>Oils Terminal — Daily Digest</b>\n📅 ${today}\n\n`;
    
    // 📊 Ключевые метрики (демо — замени на реальные запросы к базе)
    const metrics = [
      { label: '🌴 Palm Production', value: 85600, change: +2.1 },
      { label: '🫘 Soy Exports', value: 46500, change: -0.8 },
      { label: '🌻 Sunflower Stocks', value: 850, change: +5.3 },
      { label: '🌼 Rapeseed Consumption', value: 32100, change: +1.2 }
    ];
    
    message += `<b>📈 Key Metrics (000' MT):</b>\n`;
    for (const m of metrics) {
      const arrow = m.change >= 0 ? '🟢' : '🔴';
      const sign = m.change >= 0 ? '+' : '';
      message += `${arrow} ${m.label}: <b>${formatNum(m.value)}</b> (${sign}${m.change}%)\n`;
    }
    
    message += `\n<b>📰 Top News:</b>\n`;
    message += `• CPO prices rise on strong EU biodiesel demand (Palmoil Magazine)\n`;
    message += `• USDA revises soybean export forecast upward (Agri-Pulse)\n`;
    message += `• New EUDR guidelines published for importers (Euractiv)\n`;
    
    message += `\n🔗 <a href="https://oils-terminal.vercel.app">Открыть терминал</a>`;
    
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
