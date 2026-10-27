// /lab/trade/data?r=RU — сведённые данные о торговле одной страны (для переключения стран без
// перезагрузки страницы). Под тем же паролем лаборатории (middleware, matcher /lab/:path*).
import { NextResponse } from 'next/server';
import { getCountryTrade } from '@/lib/gtt-data';
import { GTT_REPORTERS } from '@/lib/gtt-meta';
import { mergeCountry } from '@/lib/trade-merge';
import { partnerNamer } from '@/lib/trade-names';
import { getLabDict } from '@/lib/lab-i18n';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const r = new URL(request.url).searchParams.get('r') || '';
  if (!GTT_REPORTERS.some(x => x.code === r)) return NextResponse.json({ error: 'unknown reporter' }, { status: 400 });
  const { lang, L } = getLabDict();
  const { rows, status, comtrade } = await getCountryTrade(r);
  const data = mergeCountry(rows, status, comtrade, partnerNamer(lang, L.trade.unspecified, L.trade.otherEurope));
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=600' } });
}
