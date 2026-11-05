// /api/vk/check — проверка ключа ВКонтакте без публикации. Доступ: CRON_SECRET.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { checkVk } from '@/lib/vk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await checkVk());
}
