// lib/news.ts — лента новостей сайта.
// Основной источник — data/news.json: новости, которые ежедневно отбирает и проверяет
// задача по расписанию (правила в docs/news-curation.md). Если файл пуст,
// сайт показывает автоматическую RSS-ленту (lib/news-rss.ts) и помечает это.
import curated from '@/data/news.json';
import { getRssNews } from './news-rss';

export type Topic = 'palm' | 'soy' | 'sunflower' | 'rapeseed' | 'biofuel' | 'policy' | 'trade';

export type NewsItem = {
  title: string;          // заголовок на русском
  titleEn?: string;       // короткий заголовок на английском (для Daily Snapshot)
  url: string;            // ссылка на первоисточник
  summary: string;        // 1–2 предложения с ключевой цифрой
  publishedAt: string;    // дата публикации первоисточника
  source: string;         // издание
  lang: 'ru' | 'en';      // язык первоисточника
  topics: Topic[];
  originalTitle?: string; // заголовок первоисточника, если он не на русском
  region?: string;        // страна или регион, если новость о конкретном рынке
};

export const TOPIC_LABELS: Record<Topic, string> = {
  palm: 'Пальма',
  soy: 'Соя',
  sunflower: 'Подсолнечник',
  rapeseed: 'Рапс',
  biofuel: 'Биотопливо',
  policy: 'Регулирование',
  trade: 'Торговля',
};

export type NewsFeed = {
  items: NewsItem[];
  curated: boolean;          // true — отобрано и проверено; false — автоматическая RSS-лента
  updatedAt: string | null;  // когда обновлялся отбор
};

const MAX_AGE_DAYS = 30;

type CuratedFile = { updatedAt: string | null; items: (NewsItem & { id: string; addedAt: string })[] };

export function getCuratedNews(now = Date.now()): NewsItem[] {
  const file = curated as unknown as CuratedFile;
  const cutoff = now - MAX_AGE_DAYS * 86400_000;
  return (file.items || [])
    .filter(n => {
      const t = new Date(n.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Новости, добавленные в отбор за последние `hours` часов (для Telegram). */
export function getRecentlyAdded(hours: number, now = Date.now()) {
  const file = curated as unknown as CuratedFile;
  return (file.items || [])
    .filter(n => now - new Date(n.addedAt).getTime() < hours * 3600_000)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Новости, добавленные в отбор позже момента `since`, от свежих к старым. */
export function getAddedSince(since: Date) {
  const file = curated as unknown as CuratedFile;
  return (file.items || [])
    .filter(n => new Date(n.addedAt).getTime() > since.getTime())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNewsFeed(): Promise<NewsFeed> {
  const items = getCuratedNews();
  const updatedAt = (curated as unknown as CuratedFile).updatedAt ?? null;
  if (items.length > 0) return { items, curated: true, updatedAt };
  return { items: await getRssNews(), curated: false, updatedAt: null };
}
