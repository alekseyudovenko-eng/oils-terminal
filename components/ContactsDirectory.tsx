'use client';
// Каталог контактов: поиск по компании и по людям, фильтр по стране, постраничный вывод.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ContactIndexRow } from '@/lib/company-contacts';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
const PAGE = 100;

export default function ContactsDirectory({ rows, countries, ru }: {
  rows: ContactIndexRow[]; countries: { code: string; label: string }[]; ru: boolean;
}) {
  const [q, setQ] = useState('');
  const [cc, setCc] = useState('');
  const [onlyReach, setOnlyReach] = useState(false);
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.c, (m.get(r.c) ?? 0) + 1);
    return m;
  }, [rows]);

  const found = useMemo(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    return rows.filter(r => {
      if (cc && r.c !== cc) return false;
      if (onlyReach && !r.ph && !r.em) return false;
      if (!toks.length) return true;
      const hay = norm(`${r.n} ${r.pn}`);
      return toks.every(t => hay.includes(t));
    });
  }, [rows, q, cc, onlyReach]);

  const pages = Math.max(1, Math.ceil(found.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = found.slice(cur * PAGE, cur * PAGE + PAGE);
  const label = (code: string) => countries.find(c => c.code === code)?.label ?? code.toUpperCase();
  const reset = () => setPage(0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="search" value={q} onChange={e => { setQ(e.target.value); reset(); }} aria-label={ru ? 'Поиск' : 'Search'}
          placeholder={ru ? 'Компания или имя человека' : 'Company or person name'}
          className="w-full sm:w-80 rounded border border-rule bg-panel px-3 py-1.5 text-sm" />
        <select value={cc} onChange={e => { setCc(e.target.value); reset(); }} aria-label={ru ? 'Страна' : 'Country'}
          className="rounded border border-rule bg-panel px-3 py-1.5 text-sm">
          <option value="">{ru ? 'Все страны' : 'All countries'} ({rows.length})</option>
          {countries.map(c => <option key={c.code} value={c.code}>{c.label} ({counts.get(c.code) ?? 0})</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={onlyReach} onChange={e => { setOnlyReach(e.target.checked); reset(); }} />
          {ru ? 'только с телефоном или почтой' : 'with phone or email only'}
        </label>
      </div>
      <p className="text-xs text-ink-3 mb-2 num">{found.length} {ru ? 'компаний' : 'companies'}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[640px]">
          <thead><tr className="text-xs text-ink-3 border-b border-rule text-left">
            <th scope="col" className="py-2 pr-4 font-normal w-[50%]">{ru ? 'Компания' : 'Company'}</th>
            <th scope="col" className="py-2 px-4 font-normal w-[20%]">{ru ? 'Страна' : 'Country'}</th>
            <th scope="col" className="py-2 px-4 font-normal w-[10%] text-right">{ru ? 'Людей' : 'People'}</th>
            <th scope="col" className="py-2 pl-4 font-normal w-[20%]">{ru ? 'Есть' : 'Has'}</th>
          </tr></thead>
          <tbody className="divide-y divide-rule">
            {shown.map(r => (
              <tr key={`${r.c}|${r.n}`}>
                <th scope="row" className="py-2 pr-4 text-left font-normal break-words">
                  <Link href={`/lab/importers/company/${encodeURIComponent(r.c)}/${encodeURIComponent(r.n)}`} className="font-medium text-ink underline decoration-rule underline-offset-4 hover:text-gold">{r.n}</Link>
                </th>
                <td className="py-2 px-4 text-ink-2">{label(r.c)}</td>
                <td className="py-2 px-4 text-right num text-ink-2">{r.p || '—'}</td>
                <td className="py-2 pl-4 text-ink-3 text-xs">{[r.ph && (ru ? 'тел.' : 'tel.'), r.em && 'email'].filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {found.length === 0 && <p className="py-6 text-center text-ink-3">{ru ? 'Ничего не найдено.' : 'Nothing found.'}</p>}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button type="button" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded border border-rule px-3 py-1 disabled:opacity-40">←</button>
          <span className="num text-ink-2">{cur + 1} / {pages}</span>
          <button type="button" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded border border-rule px-3 py-1 disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
