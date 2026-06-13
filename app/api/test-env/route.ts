// app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasCronSecret: !!process.env.CRON_SECRET,
    cronSecretPreview: process.env.CRON_SECRET 
      ? `${process.env.CRON_SECRET.slice(0, 3)}***${process.env.CRON_SECRET.slice(-3)}` 
      : 'NOT SET',
    allKeys: Object.keys(process.env).filter(k => k.includes('CRON') || k.includes('SECRET'))
  });
}
