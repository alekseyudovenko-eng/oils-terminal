// app/api/cron/usda-sync/route.ts — DEBUG VERSION
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  // 🔍 DEBUG: Показываем, что пришло
  const authHeader = request.headers.get('authorization');
  const debugMode = url.searchParams.get('debug') === '1';
  
  const expected = process.env.CRON_SECRET;
  
  // Если включен режим отладки — пропускаем проверку и показываем инфу
  if (debugMode) {
    return NextResponse.json({
      debug: true,
      receivedHeader: authHeader ? `${authHeader.slice(0, 20)}...` : 'MISSING',
      expectedKey: expected ? `${expected.slice(0, 4)}****${expected.slice(-4)}` : 'NOT SET',
      envKeys: Object.keys(process.env).filter(k => k.includes('CRON') || k.includes('SECRET')),
      hint: 'If expectedKey is "NOT SET" → redeploy after adding env var. If header is "MISSING" → check curl command.'
    });
  }
  
  // 🔐 Обычная проверка
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      debug: {
        hasEnv: !!expected,
        headerReceived: !!authHeader,
        headerMatch: authHeader === `Bearer ${expected}`
      }
    }, { status: 401 });
  }

  // ✅ Если проверка прошла — выполняем синхронизацию
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // ... здесь твой код синхронизации (пока заглушка)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sync completed (debug mode)',
      timestamp: new Date().toISOString()
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
