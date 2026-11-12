// lib/market-calendar.ts — календарь рынка масел: даты отчётов и событий.
// Точные даты: WASDE (график USDA на 2026 г., cmegroup.com / usda.gov), сроки регулирования ЕС.
// Ориентировочные (approx): MPOB около 10-го, грузовые сюрвейеры ITS/AmSpec 10/15/20/25 и конец месяца,
// референсная цена CPO Малайзии на следующий месяц около середины месяца. Выходные переносим на понедельник.
// Даты WASDE на 2027 г. добавить, когда USDA опубликует график.

/** Даты WASDE (публикация в 12:00 по Вашингтону = 17:00 UTC зимой, 16:00 UTC летом). */
export const WASDE_DATES: string[] = [
  '2026-01-12', '2026-02-10', '2026-03-10', '2026-04-09', '2026-05-12', '2026-06-11',
  '2026-07-10', '2026-08-12', '2026-09-11', '2026-10-09', '2026-11-10', '2026-12-10',
];

export type CalKind = 'wasde' | 'mpob' | 'cargo' | 'refprice' | 'reg';
export type CalEvent = { date: string; kind: CalKind; approx: boolean; key?: string; day?: number };

/** Разовые события (точные даты). key — ключ подписи в словаре. */
const FIXED: CalEvent[] = [
  { date: '2026-12-30', kind: 'reg', approx: false, key: 'eudr' },
  { date: '2027-01-01', kind: 'reg', approx: false, key: 'contaminants' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** Суббота/воскресенье → следующий понедельник. */
function nextBusinessDay(d: Date): Date {
  const x = new Date(d);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

/** Ближайший WASDE не раньше даты (если известен). */
export function nextWasde(from = new Date()): string | null {
  const today = iso(from);
  return WASDE_DATES.find(d => d >= today) ?? null;
}

/** Последний вышедший WASDE на момент времени (для подписи «данные WASDE от …»). */
export function lastWasdeBefore(at: Date | string): string | null {
  const t = typeof at === 'string' ? at.slice(0, 10) : iso(at);
  let found: string | null = null;
  for (const d of WASDE_DATES) if (d <= t) found = d;
  return found;
}

/**
 * Нужно ли сегодня обновлять балансы USDA: день выхода WASDE или следующий день (повтор).
 * Для месяцев без известной даты WASDE — с 9 по 13 число (обычное окно выхода отчёта).
 */
export function isWasdeWindow(now = new Date()): boolean {
  const today = iso(now);
  const yest = iso(new Date(now.getTime() - 86400_000));
  if (WASDE_DATES.includes(today) || WASDE_DATES.includes(yest)) return true;
  const ym = today.slice(0, 7);
  const knownThisMonth = WASDE_DATES.some(d => d.startsWith(ym));
  const day = now.getUTCDate();
  return !knownThisMonth && day >= 9 && day <= 13;
}

/** События с даты from на days дней вперёд, по порядку. */
export function upcomingEvents(from = new Date(), days = 45): CalEvent[] {
  const start = iso(from);
  const end = iso(new Date(from.getTime() + days * 86400_000));
  const out: CalEvent[] = [];
  for (const d of WASDE_DATES) out.push({ date: d, kind: 'wasde', approx: false });
  for (const e of FIXED) out.push(e);
  // Повторяющиеся ежемесячные события: текущий и два следующих месяца.
  for (let k = 0; k < 3; k++) {
    const y = from.getUTCFullYear(), m = from.getUTCMonth() + k;
    out.push({ date: iso(nextBusinessDay(utc(y, m, 10))), kind: 'mpob', approx: true });
    out.push({ date: iso(nextBusinessDay(utc(y, m, 15))), kind: 'refprice', approx: true });
    for (const dd of [10, 15, 20, 25]) out.push({ date: iso(nextBusinessDay(utc(y, m, dd))), kind: 'cargo', approx: true, day: dd });
    // Конец месяца: последний календарный день; если выходной — данные выходят в первый рабочий день.
    out.push({ date: iso(nextBusinessDay(utc(y, m + 1, 0))), kind: 'cargo', approx: true, key: 'monthEnd' });
  }
  const seen = new Set<string>();
  return out
    .filter(e => e.date >= start && e.date <= end)
    .filter(e => { const k = `${e.date}|${e.kind}|${e.key ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : a.date.localeCompare(b.date)));
}
