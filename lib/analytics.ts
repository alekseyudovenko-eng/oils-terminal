// lib/analytics.ts — раздел «Аналитика IMA»: статьи и обзоры.
// Статья — файл data/analytics/<slug>.json: { slug, date, lang, title, summary, body: [абзацы], sources?: [{title,url}] }.
// Только публичные данные: без цифр Oil World, GTT, MPOB-подписки и цен zyotwdhon.
import fs from 'fs';
import path from 'path';

export type Article = {
  slug: string; date: string; lang: 'ru' | 'en'; title: string; summary: string;
  body: string[]; sources?: { title: string; url: string }[]; author?: string;
};

const DIR = path.join(process.cwd(), 'data', 'analytics');

export function getArticles(): Article[] {
  let files: string[] = [];
  try { files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')); } catch { return []; }
  return files
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Article; } catch { return null; } })
    .filter((a): a is Article => !!a && !!a.slug && !!a.title && Array.isArray(a.body))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getArticle = (slug: string) => getArticles().find(a => a.slug === slug);
