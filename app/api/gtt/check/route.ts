// /api/gtt/check — проверка доступа к Global Trade Tracker: работает ли токен,
// какие страны и периоды есть в подписке, и пробный отчёт. Ключ CRON_SECRET обязателен.
// Токен в ответ не попадает.
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { gttGet, gttReport } from '@/lib/gtt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const short = (v: unknown, n = 1500) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + '…' : s;
};

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = new URL(request.url).searchParams;
  const reporters = (p.get('reporters') || 'RU,UZ,AZ,KZ').split(',');
  const out: Record<string, unknown> = {
    auth: process.env.GTT_USERID && process.env.GTT_PASSWORD ? 'userid+password' : process.env.GTT_API_TOKEN ? 'token' : 'none',
  };

  try {
    const subs = await gttGet('getreport/subscriptions', { periodType: 'M' });
    out.subscriptions = short(subs, 4000);
  } catch (e) { out.subscriptionsError = (e as Error).message; }

  try {
    const countries = await gttGet('getreport/countries', { periods: false });
    const list: any[] = Array.isArray(countries) ? countries : countries?.countries || [];
    out.countriesTotal = list.length;
    out.countriesSample = short(list.slice(0, 3), 1200);
    out.countriesWanted = list.filter(c => reporters.some(r => JSON.stringify(c).includes(`"${r}`))).map(c => short(c, 400));
  } catch (e) { out.countriesError = (e as Error).message; }

  // Пробный отчёт: импорт пальмового масла (1511), последние 3 доступных месяца, по поставщикам.
  for (const r of reporters) {
    try {
      const rows = await gttReport({
        impexp: 'I', reporter: r, hscode: '1511', hslevel: 4, periodtype: 'M',
        latestavailablemonths: 3, currency: 'USD', unit: 'MT', dataelements: 'V,Q1',
        fallbacktomirrordata: true,
      });
      out[`test_${r}`] = { rows: rows.length, sample: short(rows.slice(0, 3), 900) };
    } catch (e) { out[`test_${r}`] = { error: (e as Error).message }; }
  }
  // Структура ответа отчёта (ключи верхнего уровня), чтобы разобрать формат.
  try {
    const { gttGet } = await import('@/lib/gtt');
    const raw = await gttGet('getreport', { layout: 'brief', format: 'json', source: 'DEFAULT', impexp: 'I', reporter: 'KZ', hscode: '1511', hslevel: 4, periodtype: 'M', latestavailablemonths: 1, currency: 'USD', unit: 'MT', dataelements: 'V,Q1' });
    out.rawShape = Array.isArray(raw) ? `array(${raw.length})` : raw && typeof raw === 'object'
      ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length}) ${short(v[0], 500)}` : short(v, 300)]))
      : short(raw, 500);
  } catch (e) { out.rawShapeError = (e as Error).message; }
  return NextResponse.json(out);
}
