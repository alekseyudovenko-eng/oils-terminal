import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { getDict } from '@/lib/i18n-server';
import { localePath } from '@/lib/i18n';

type Props = { active: 'overview' | 'market' };

export default function SiteHeader({ active }: Props) {
  const { lang, t } = getDict();
  const links = [
    { id: 'overview', href: localePath(lang, '/'), label: t.nav.overview },
    { id: 'market', href: localePath(lang, '/market'), label: t.nav.market },
  ] as const;
  return (
    <header className="bg-band text-band-text">
      <div className="mx-auto max-w-page px-4 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href={localePath(lang, '/')} className="font-cond text-xl font-semibold tracking-tight">
          Oils Terminal
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <nav aria-label={t.nav.sections} className="hidden sm:flex gap-1 text-sm">
            {links.map(l => (
              <Link
                key={l.id}
                href={l.href}
                aria-current={active === l.id ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-sm transition-colors ${
                  active === l.id ? 'bg-band-text text-band font-medium' : 'text-band-muted hover:text-band-text'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <a href="https://t.me/oilpalm" target="_blank" rel="noopener" aria-label={t.nav.telegramAria}
            className="hidden sm:inline-block whitespace-nowrap px-3 py-1.5 rounded-sm text-sm text-band-muted hover:text-band-text border border-band-muted/40">
            {t.nav.telegram}
          </a>
          <LanguageSwitcher lang={lang} label={t.nav.language} />
          {/* Телефон: меню сворачивается в одну кнопку (без JS, через <details>) */}
          <details className="sm:hidden relative group">
            <summary aria-label={t.nav.sections}
              className="list-none cursor-pointer select-none rounded-sm border border-white/15 px-2.5 py-1 text-lg leading-none [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="group-open:hidden">☰</span>
              <span aria-hidden="true" className="hidden group-open:inline">✕</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-sm border border-white/15 bg-band p-2 text-sm shadow-lg flex flex-col gap-1">
              {links.map(l => (
                <Link key={l.id} href={l.href} aria-current={active === l.id ? 'page' : undefined}
                  className={`px-3 py-2 rounded-sm ${active === l.id ? 'bg-band-text text-band font-medium' : 'text-band-text'}`}>
                  {l.label}
                </Link>
              ))}
              <a href="https://t.me/oilpalm" target="_blank" rel="noopener" aria-label={t.nav.telegramAria}
                className="px-3 py-2 rounded-sm border border-band-muted/40 text-band-text">
                {t.nav.telegram}
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
