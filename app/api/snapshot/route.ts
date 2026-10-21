// /api/snapshot — просмотр картинки «IMA Daily Snapshot» (PNG). Ничего не отправляет.
// Только публичные данные сайта, поэтому ключ не нужен.
import { renderSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { image } = await renderSnapshot();
  const png = await image.arrayBuffer();
  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
  });
}
