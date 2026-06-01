import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Импортируем данные баланса напрямую, чтобы они были доступны на сервере
import { DATASETS } from '@/lib/balance-data'; 

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Получаем свежие цены (Market Quotes)
    const { data: prices, error: pricesError } = await supabase
      .from('market_data')
      .select('*')
      .order('verified_at', { ascending: false });

    if (pricesError) throw pricesError;

    // Фильтруем дубликаты, оставляя только последние записи по каждому товару
    const latestPrices = prices?.reduce((acc: any, current: any) => {
      const existing = acc.find((item: any) => item.commodity === current.commodity);
      if (!existing) acc.push(current);
      return acc;
    }, []) || [];

    // 2. Формируем полный ответ
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      marketQuotes: latestPrices,
      balanceData: DATASETS, // Отдаем сырые данные баланса
    });

  } catch (error) {
    console.error('Full Report API Error:', error);
    return NextResponse.json({ error: 'Failed to generate full report' }, { status: 500 });
  }
}
