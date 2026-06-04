import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    // 1. Получаем цены из базы
    const { data: prices } = await supabase.from('market_data').select('commodity, value').eq('metric', 'price_spot');
    
    let msg = "🛢️ <b>Daily Market Report</b>\n\n";
    const labels: string[] = [];
    const values: number[] = [];

    prices?.forEach((p: any) => {
      // Фильтруем только основные масла
      if (p.commodity.includes('Oil')) {
        msg += `🔹 <b>${p.commodity}</b>: $${p.value}\n`;
        labels.push(p.commodity.split('(')[0].trim().substring(0, 10));
        values.push(p.value);
      }
    });

    // 2. Генерируем график
    const chartUrl = `https://quickchart.io/chart?c={type:'bar',data:{labels:['${labels.join("','")}'],datasets:[{label:'USD/MT',data:[${values.join(',')}],backgroundColor:'#3b82f6'}]}}&w=600&h=400`;

    // 3. Отправляем фото с подписью
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, photo: chartUrl, caption: msg, parse_mode: 'HTML' })
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
