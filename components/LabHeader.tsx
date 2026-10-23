// Шапка закрытой «Лаборатории IMA»: название, переключатель страниц и языка.
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { getDict } from '@/lib/i18n-server';

export default function LabHeader({ current, note, translated = false }: {
  current: string;
  note: string;
  /** true — содержание страницы переведено; иначе для не-русских версий показываем пометку. */
  translated?: boolean;
}) {
  const { lang, t } = getDict();
  const pages = [
    { href: '/lab', title: t.lab.pages.forecast },
    { href: '/lab/importers', title: t.lab.pages.importers },
    { href: '/lab/trade', title: t.lab.pages.trade },
    { href: '/lab/regulation', title: t.lab.pages.regulation },
  ];
  return (
    <>
      <header className="bg-band text-band-text">
        <div className="mx-auto max-w-page px-4 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 min-w-0">
            <span className="font-cond text-xl font-semibold tracking-tight whitespace-nowrap">{t.lab.title}</span>
            <nav aria-label={t.lab.nav} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {pages.map(p => (
                <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}
                  className={p.href === current ? 'text-band-text border-b-2 border-gold pb-0.5' : 'text-band-muted hover:text-band-text'}>
                  {p.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher lang={lang} label={t.nav.language} />
            <Link href="/" className="text-sm text-band-muted hover:text-band-text whitespace-nowrap">{t.lab.toSite}</Link>
          </div>
        </div>
      </header>
      <p className="bg-gold-soft text-ink text-sm">
        <span className="mx-auto max-w-page px-4 sm:px-6 py-2 block">
          {t.lab.closed} {note}
          {!translated && t.lab.ruOnly && <span className="block text-ink-2">{t.lab.ruOnly}</span>}
        </span>
      </p>
    </>
  );
}
