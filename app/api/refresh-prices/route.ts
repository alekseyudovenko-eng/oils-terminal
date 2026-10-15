// app/api/refresh-prices/route.ts — ручное обновление цен с кнопки на сайте.
// Открыт без ключа, но не чаще одного раза в REFRESH_COOLDOWN_MIN минут,
// чтобы посетители не могли бесконечно дёргать внешние источники.
import { NextResponse } from 'next/server';
import { getAdminClient, lastPriceUpdate, updatePrices } from '@/lib/prices';

export const dynamic = 'force-dynamic';

const REFRESH_COOLDOWN_MIN = 15;

export async function POST() {
  try {
    const supabase = getAdminClient();
    const last = await lastPriceUpdate(supabase);
    if (last) {
      const minutesAgo = (Date.now() - last.getTime()) / 60000;
      if (minutesAgo < REFRESH_COOLDOWN_MIN) {
        return NextResponse.json(
          {
            success: false,
            throttled: true,
            message: `Цены обновлялись ${Math.floor(minutesAgo)} мин. назад. Повторить можно через ${Math.ceil(REFRESH_COOLDOWN_MIN - minutesAgo)} мин.`,
          },
          { status: 429 }
        );
      }
    }
    const result = await updatePrices(supabase);
    return NextResponse.json({ success: result.errors.length === 0, ...result });
  } catch (e: any) {
    console.error('refresh-prices error:', e);
    return NextResponse.json({ success: false, message: 'Не удалось обновить цены' }, { status: 500 });
  }
}
