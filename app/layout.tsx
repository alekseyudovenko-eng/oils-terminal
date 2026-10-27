import './globals.css';
import type { Metadata } from 'next';
import { Fira_Sans, Fira_Sans_Condensed } from 'next/font/google';
import { getDict, getLocale } from '@/lib/i18n-server';
import { OG_LOCALE, SITE_URL } from '@/lib/site';

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

/** Код подтверждения: принимает и сам код, и целый meta-тег, скопированный из Search Console / Bing. */
function verificationCode(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  const m = v.match(/content\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : v;
}

export function generateMetadata(): Metadata {
  const { lang, t } = getDict();
  // Коды подтверждения для Google Search Console и Bing Webmaster задаются в Vercel (необязательно).
  const google = verificationCode(process.env.GOOGLE_SITE_VERIFICATION);
  const bing = verificationCode(process.env.BING_SITE_VERIFICATION);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: 'Oils Terminal', template: '%s — Oils Terminal' },
    description: t.meta.description,
    openGraph: {
      type: 'website',
      siteName: 'Oils Terminal · IMA',
      title: 'Oils Terminal',
      description: t.meta.description,
      locale: OG_LOCALE[lang],
      // Картинка Daily Snapshot (1080×1350) с котировками и главными новостями дня.
      images: [{ url: '/api/snapshot', width: 1080, height: 1350, alt: 'IMA Daily Snapshot' }],
    },
    twitter: { card: 'summary_large_image' },
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} className={`${sans.variable} ${cond.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
