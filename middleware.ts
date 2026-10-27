// middleware.ts
// 1. Языковые адреса публичных страниц: /en, /en/market и т. д. показывают те же страницы,
//    что / и /market, но на выбранном языке (язык передаётся заголовком x-locale).
//    Русская версия — без префикса. Если посетитель раньше выбрал другой язык (cookie lang),
//    с / и /market его перенаправляем на его версию.
// 2. Закрывает раздел /lab паролем (HTTP Basic Auth).
//    Пароль задаётся переменной LAB_PASSWORD в Vercel. Пока её нет, раздел отвечает 404.
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LANG_COOKIE, LOCALE_HEADER, isLocale, localePath, splitLocalePath } from './lib/i18n';

export const config = {
  matcher: [
    '/', '/market',
    '/(en|uz|kk|ms)', '/(en|uz|kk|ms)/market',
    '/lab', '/lab/:path*',
  ],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/lab' || pathname.startsWith('/lab/')) return labAuth(req);

  const { lang, path } = splitLocalePath(pathname);
  const headers = new Headers(req.headers);

  if (lang) {
    // /en/market → показываем /market на английском, адрес в браузере не меняется.
    headers.set(LOCALE_HEADER, lang);
    const url = req.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // Русский адрес. Посетителя, который выбрал другой язык, ведём на его версию.
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = localePath(saved, path);
    return NextResponse.redirect(url, 307);
  }
  headers.set(LOCALE_HEADER, DEFAULT_LOCALE);
  return NextResponse.next({ request: { headers } });
}

function labAuth(req: NextRequest) {
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
