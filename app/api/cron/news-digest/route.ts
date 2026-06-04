import { NextResponse } from 'next/server';

export async function GET() {
  // 1. Проверяем, видит ли код переменные окружения
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ 
      status: "FAIL", 
      reason: "Environment variables missing in Vercel",
      hint: "Go to Vercel -> Settings -> Environment Variables and add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID"
    }, { status: 500 });
  }

  // 2. Пробуем отправить тестовое сообщение
  try {
    const testMessage = "✅ <b>Connection Test Successful!</b>\nYour Vercel Cron Job is connected to Telegram.";
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        status: "FAIL", 
        reason: "Telegram API rejected the request", 
        details: data 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: "SUCCESS", 
      message: "Test message sent to Telegram",
      telegram_response: data.ok
    });

  } catch (error) {
    return NextResponse.json({ 
      status: "FAIL", 
      reason: "Network or Code Error", 
      error_details: String(error) 
    }, { status: 500 });
  }
}
