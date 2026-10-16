import Link from 'next/link';

type Props = { active: 'overview' | 'market' };

const LINKS = [
  { id: 'overview', href: '/', label: 'Обзор' },
  { id: 'market', href: '/market', label: 'Рынок' },
] as const;

export default function SiteHeader({ active }: Props) {
  return (
    <header className="bg-band text-band-text">
      <div className="mx-auto max-w-page px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="font-cond text-xl font-semibold tracking-tight">
          Oils Terminal
        </Link>
        <nav aria-label="Разделы" className="flex gap-1 text-sm">
          {LINKS.map(l => (
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
      </div>
    </header>
  );
}
