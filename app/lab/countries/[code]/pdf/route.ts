// GET /lab/countries/[code]/pdf — PDF-отчёт по стране на бланке IMA.
// Раздел /lab закрыт паролем в middleware.ts; отчёт создаётся на лету, нигде не сохраняется и не индексируется.
import { NextResponse } from 'next/server';
import { getLocale } from '@/lib/i18n-server';
import { buildCountryReport, reportFileName } from '@/lib/country-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const pdf = await buildCountryReport(params.code, getLocale());
    if (!pdf) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportFileName(params.code)}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (e) {
    console.error('country report:', e);
    return new NextResponse('Report failed', { status: 500 });
  }
}
