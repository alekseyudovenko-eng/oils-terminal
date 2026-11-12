// /api/subscribe — подписка на еженедельный обзор (таблица subscribers в Supabase, не в репозитории).
// Хранятся только e-mail, необязательные имя и компания, язык, откуда подписались и время согласия.
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getFreshDb as getDb } from '@/lib/db';
import { isLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ status: 'invalid' }, { status: 400 }); }
  // Ловушка для ботов: скрытое поле должно остаться пустым.
  if (clean(body?.website, 100)) return NextResponse.json({ status: 'ok' });
  const email = clean(body?.email, 254).toLowerCase();
  if (!EMAIL.test(email) || body?.consent !== true) return NextResponse.json({ status: 'invalid' }, { status: 400 });
  const db = getDb();
  if (!db) return NextResponse.json({ status: 'error' }, { status: 500 });

  const { data: existing } = await db.from('subscribers').select('id,unsubscribed_at').eq('email', email).maybeSingle();
  if (existing && !existing.unsubscribed_at) return NextResponse.json({ status: 'already' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const row = {
    email,
    name: clean(body?.name, 120) || null,
    company: clean(body?.company, 160) || null,
    lang: isLocale(body?.lang) ? body.lang : null,
    source: clean(body?.source, 60) || null,
    consent_at: new Date().toISOString(),
    ip_hash: ip ? createHash('sha256').update(ip + (process.env.CRON_SECRET || '')).digest('hex').slice(0, 16) : null,
    unsubscribed_at: null,
  };
  const { error } = existing
    ? await db.from('subscribers').update(row).eq('id', existing.id)
    : await db.from('subscribers').insert(row);
  if (error) { console.error('subscribe:', error.message); return NextResponse.json({ status: 'error' }, { status: 500 }); }
  return NextResponse.json({ status: 'ok' });
}
