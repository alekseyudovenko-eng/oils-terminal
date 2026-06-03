import Link from 'next/link';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200">
      {/* --- STRICT HEADER --- */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition">
              OILS TERMINAL
            </Link>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
              <Link href="/" className="hover:text-blue-600">Market Data</Link>
              <Link href="/balance" className="hover:text-blue-600">Balance</Link>
              <Link href="/news" className="hover:text-blue-600 font-bold text-blue-700">News</Link> {/* Добавлено */}
              <Link href="/" className="hover:text-slate-900 transition">Market Data</Link>
              <Link href="/regional-review" className="hover:text-slate-900 transition">Regional Review</Link>
              <Link href="/balance" className="hover:text-slate-900 transition">Balance Sheet</Link>
            </nav>
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {title}
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-100 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-slate-400">
          <p>© 2026 International Marketing Agency Ltd.</p>
          <p>Data provided by MPOC & Partners</p>
        </div>
      </footer>
    </div>
  );
}
