import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    // 1. Получаем последние цены из базы
    // Мы берем данные, которые обновляет твой daily-update скрипт
    const { data: prices, error } = await supabase
      .from('market_data')
      .select('commodity, value')
      .eq('metric', 'price_spot')
      .order('commodity');

    if (error) throw error;

    let msg = "🛢️ <b>Daily Market Report</b>\n";
    msg += `📅 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    
    const labels: string[] = [];
    const values: number[] = [];

    prices?.forEach((p: any) => {
      // Фильтруем только масла для графика, чтобы не было каши
      if (p.commodity.includes('Oil') || p.commodity.includes('Palm')) {
        msg += `🔹 <b>${p.commodity}</b>: $${p.value}\n`;
        // Для графика берем короткое имя
        const shortName = p.commodity.split('(')[0].trim().substring(0, 12);
        labels.push(shortName);
        values.push(p.value);
      }
    });

    if (values.length === 0) {
       msg += "⚠️ No price data available today.";
    }

    // 2. Генерируем график через QuickChart
    // Если данных нет, график не генерируем
    let photoUrl = "";
    if (values.length > 0) {
      photoUrl = `https://quickchart.io/chart?c={type:'bar',data:{labels:['${labels.join("','")}'],datasets:[{label:'USD/MT',data:[${values.join(',')}],backgroundColor:'#3b82f6'}]}}&w=600&h=400`;
    }

    // 3. Отправляем в Telegram
    if (photoUrl) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: CHAT_ID, 
          photo: photoUrl, 
          caption: msg, 
          parse_mode: 'HTML' 
        })
      });
    } else {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: CHAT_ID, 
          text: msg, 
          parse_mode: 'HTML' 
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Cron Market Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
