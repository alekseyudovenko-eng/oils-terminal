// lib/links.ts — ссылки на Telegram-канал с UTM-метками (откуда пришёл человек) и диплинки на разделы сайта.
export const TG_BASE = 'https://t.me/oilpalm';
export const SITE = 'https://imaoils.vercel.app';

/** Ссылка на канал с метками сайта: medium = место на странице (header, footer, cta, news). */
export function tgUrl(medium: string, campaign?: string): string {
  const p = new URLSearchParams({ utm_source: 'site', utm_medium: medium });
  if (campaign) p.set('utm_campaign', campaign);
  return `${TG_BASE}?${p}`;
}

/** Ссылка на сайт из поста Telegram/FB/VK с метками; hash — якорь раздела (напр. 'prices', 'news'), path — страница. */
export function siteUrl(source: string, campaign: string, path = '/', hash = ''): string {
  const p = new URLSearchParams({ utm_source: source, utm_medium: 'social', utm_campaign: campaign });
  return `${SITE}${path}?${p}${hash ? `#${hash}` : ''}`;
}
