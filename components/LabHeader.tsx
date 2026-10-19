// Шапка закрытой «Лаборатории IMA»: название и переключатель страниц.
import Link from 'next/link';

const PAGES = [
  { href: '/lab', title: 'Прогноз' },
  { href: '/lab/importers', title: 'Импортёры' },
];

export default function LabHeader({ current, note }: { current: string; note: string }) {
  return (
    <>
      <header className="bg-band text-band-text">
        <div className="mx-auto max-w-page px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-cond text-xl font-semibold tracking-tight whitespace-nowrap">Лаборатория IMA</span>
            <nav aria-label="Страницы лаборатории" className="flex gap-4 text-sm">
              {PAGES.map(p => (
                <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}
                  className={p.href === current ? 'text-band-text border-b-2 border-gold pb-0.5' : 'text-band-muted hover:text-band-text'}>
                  {p.title}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/" className="text-sm text-band-muted hover:text-band-text whitespace-nowrap">На сайт</Link>
        </div>
      </header>
      <p className="bg-gold-soft text-ink text-sm">
        <span className="mx-auto max-w-page px-4 sm:px-6 py-2 block">
          Закрытая страница: её видят только те, у кого есть пароль. {note}
        </span>
      </p>
    </>
  );
}
