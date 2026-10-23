import './globals.css';
import type { Metadata } from 'next';
import { Fira_Sans, Fira_Sans_Condensed } from 'next/font/google';
import { getDict, getLocale } from '@/lib/i18n-server';

const sans = Fira_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const cond = Fira_Sans_Condensed({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-cond',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  const { t } = getDict();
  return {
    title: { default: 'Oils Terminal', template: '%s — Oils Terminal' },
    description: t.meta.description,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} className={`${sans.variable} ${cond.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
