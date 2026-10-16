// app/api/quotes/route.ts — котировки и спреды в JSON (для проверки и внешних скриптов).
import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/quotes';

export const revalidate = 600;

export async function GET() {
  const data = await getQuotes();
  return NextResponse.json(data, { status: data.error ? 502 : 200 });
}
