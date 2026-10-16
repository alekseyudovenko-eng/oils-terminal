// middleware.ts — закрывает раздел /lab паролем (HTTP Basic Auth).
// Пароль задаётся переменной LAB_PASSWORD в Vercel. Пока её нет, раздел отвечает 404.
import { NextResponse, type NextRequest } from 'next/server';

export const config = { matcher: ['/lab', '/lab/:path*'] };

export function middleware(req: NextRequest) {
  const password = process.env.LAB_PASSWORD;
  if (!password) return new NextResponse('Not found', { status: 404 });

  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const [, pass] = atob(header.slice(6)).split(':');
      if (pass === password) {
        const res = NextResponse.next();
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        res.headers.set('Cache-Control', 'private, no-store');
        return res;
      }
    } catch {
      // неверный заголовок — запросим пароль ещё раз
    }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="IMA Lab", charset="UTF-8"' },
  });
}
