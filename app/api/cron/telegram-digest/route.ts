// app/api/cron/telegram-digest/route.ts
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// 🔹 Форматирует число: 78500 → "78.5K"
function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export async function GET(request: Request) {
  // 🔐 Защита крона
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // 📰 Заголовок
    let message = `🌴 <b>Oils Terminal — Daily Digest</b>\n📅 ${today}\n\n`;
    
    // 📊 Ключевые метрики (берём последние доступные из базы)
    // Для продакшена здесь можно сделать реальные запросы к Supabase
    // Сейчас — демо-данные, которые ты можешь заменить на реальные запросы
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
    
    // 📰 Последние новости (заголовок + источник)
    // Для продакшена: fetch(`/api/news`) и парсинг
    message += `\n<b>📰 Top News:</b>\n`;
    message += `• CPO prices rise on strong EU biodiesel demand (Palmoil Magazine)\n`;
    message += `• USDA revises soybean export forecast upward (Agri-Pulse)\n`;
    message += `• New EUDR guidelines published for importers (Euractiv)\n`;
    
    // 🔗 Ссылка
    message += `\n🔗 <a href="https://oils-terminal.vercel.app">Открыть терминал</a>`;
    
    // 📤 Отправка
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
