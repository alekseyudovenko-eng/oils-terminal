// app/api/news/route.ts
import { NextResponse } from 'next/server';
import { fetchFilteredNews } from '@/lib/news-parser';

export async function GET() {
  const news = await fetchFilteredNews(35);
  return NextResponse.json({
    news,
    meta: { timestamp: new Date().toISOString() }
  });
}
