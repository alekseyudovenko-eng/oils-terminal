// app/api/cron/telegram-digest/route.ts — SIMPLE TEST
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

  // 🔹 ПРОСТОЙ ТЕСТ: отправляем минимальное сообщение
  const testMessage = "✅ Telegram connection test — если видишь это, всё работает.";
  
  const sent = await sendTelegramMessage(testMessage);
  
  return NextResponse.json({ 
    success: sent, 
    message: sent ? 'Test message sent' : 'Failed — check Vercel logs for details',
    timestamp: new Date().toISOString()
  });
}
