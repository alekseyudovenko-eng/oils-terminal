import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface NewsItem {
  title: string;
  url: string;
  content: string;
  published_date: string;
  source: string;
}

interface SourceConfig {
  name: string;
  url: string;
  type: 'html' | 'rss';
  selectors?: {
    item: string;
    title: string;
    link: string;
    date?: string;
  };
}

// Список источников для парсинга
const SOURCES: SourceConfig[] = [
  { 
    name: 'APK-Inform', 
    url: 'https://www.apk-inform.com/en/news', 
    type: 'html',
    selectors: { item: '.news-item, article', title: 'h3 a, .title', link: 'a', date: '.date, time' }
  },
  { 
    name: 'MPOC', 
    url: 'https://mpoc.org.my/category/market-news/', 
    type: 'html',
    selectors: { item: '.post, article', title: 'h2 a, .entry-title', link: 'a', date: '.published, time' }
  }
];

export async function GET() {
  let allNews: NewsItem[] = [];

  for (const source of SOURCES) {
    // Пропускаем RSS источники в этом блоке (для них нужен rss-parser)
    if (source.type !== 'html' || !source.selectors) continue;

    try {
      const res = await fetch(source.url, {
        headers: { 'User-Agent
