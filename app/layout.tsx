import './globals.css';
import type { Metadata } from 'next';
import { Fira_Sans, Fira_Sans_Condensed } from 'next/font/google';

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

export const metadata: Metadata = {
  title: { default: 'Oils Terminal', template: '%s — Oils Terminal' },
  description: 'Котировки пальмового, соевого, подсолнечного и рапсового масла, спред POGO, балансы USDA и новости рынка.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${cond.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
