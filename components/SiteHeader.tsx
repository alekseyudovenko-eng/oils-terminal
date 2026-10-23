import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { getDict } from '@/lib/i18n-server';

type Props = { active: 'overview' | 'market' };

export default function SiteHeader({ active }: Props) {
  const { lang, t } = getDict();
  const links = [
    { id: 'overview', href: '/', label: t.nav.overview },
    { id: 'market', href: '/market', label: t.nav.market },
  ] as const;
  return (
    <header className="bg-band text-band-text">
      <div className="mx-auto max-w-page px-4 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Link href="/" className="font-cond text-xl font-semibold tracking-tight">
          Oils Terminal
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label={t.nav.sections} className="flex gap-1 text-sm">
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
          <LanguageSwitcher lang={lang} label={t.nav.language} />
        </div>
      </div>
    </header>
  );
}
