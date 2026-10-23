'use client';
// Переключатель языка: запоминает выбор в cookie на год и перерисовывает страницу на сервере.
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, LOCALE_SHORT, type Locale } from '@/lib/i18n';

export default function LanguageSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function change(next: string) {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  }

  return (
    <label className="relative inline-flex items-center text-sm">
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-band-muted">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.75 8h12.5M8 1.75c1.9 2 2.8 4.1 2.8 6.25S9.9 12.25 8 14.25C6.1 12.25 5.2 10.15 5.2 8S6.1 3.75 8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <select
        value={lang}
        onChange={e => change(e.target.value)}
        disabled={pending}
        title={label}
        className="appearance-none rounded-sm border border-white/15 bg-transparent py-1 pl-7 pr-6 text-band-text hover:border-white/30 focus:border-gold disabled:opacity-60 cursor-pointer"
      >
        {LOCALES.map((l: Locale) => (
          <option key={l} value={l} className="text-ink bg-panel">
            {LOCALE_SHORT[l]} · {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 10 6" className="pointer-events-none absolute right-2 h-1.5 w-2.5 text-band-muted">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </label>
  );
}
