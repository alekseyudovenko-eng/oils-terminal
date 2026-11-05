// lib/channel-schedule.ts — сетка публикаций Telegram-канала @oilpalm (решение от 5 ноября 2026):
// не больше 2 постов в день, публикации в 08:00–10:00 по Москве, в выходные канал молчит.
//   пн: Snapshot + опрос недели      вт: Snapshot + дайджест новостей
//   ср: Snapshot + «Мифы»            чт: Snapshot + дайджест
//   пт: Snapshot + «Итоги недели» (с итогом опроса)
// Рубрики MPOB и «Импорт в Россию» выходят во вторник или четверг вместо дайджеста.
// Дайджест уступает место любому посту: если на сегодня уже 2 поста, новости переходят в следующий дайджест.
import { getFreshDb as getDb } from './db';

export const MAX_POSTS_PER_DAY = 2;

const today = () => new Date().toISOString().slice(0, 10);

/** День недели по Москве: 0 = воскресенье … 6 = суббота. */
export function mskWeekday(d = new Date()): number {
  return new Date(d.getTime() + 3 * 3600_000).getUTCDay();
}

export const isWeekendMsk = (d = new Date()) => { const w = mskWeekday(d); return w === 0 || w === 6; };

/** Сколько постов уже ушло в канал сегодня (Snapshot, дайджест, рубрики и опросы). */
export async function channelPostsToday(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const { data } = await db.from('price_snapshots').select('series').eq('day', today()).like('series', '_sent:%').limit(100);
  return (data || []).filter((r: any) => {
    const s = String(r.series);
    return s === '_sent:daily-snapshot' || s === '_sent:news-digest' || s.startsWith('_sent:post:');
  }).length;
}
