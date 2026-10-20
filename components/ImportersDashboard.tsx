'use client';
// Аналитика по импортёрам: фильтры (страны, код ТН ВЭД, годы, сегмент, масштаб, достоверность),
// по которым перестраиваются графики и таблицы. Графики — SVG и HTML без библиотек.
import { useMemo, useState } from 'react';
import type { Company, Country } from '@/lib/importers';

const EU = ['pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'hr', 'ee', 'lv', 'lt'];
const CIS = ['ru', 'ua', 'by', 'md', 'kz', 'uz', 'kg', 'tj', 'tm', 'am', 'az'];

const CODES = [
  { id: '1511m', label: '1511 · пальмовое, зеркальные', hint: 'Импорт по отчётам стран-поставщиков (TradeMap). Ряд полный для всех стран, 2016–2025.' },
  { id: '1511', label: '1511 · пальмовое', hint: 'Данные самой страны (TradeMap); у РФ и Беларуси ряд обрывается на 2021 г.' },
  { id: '1513', label: '1513 · кокосовое / пальмоядровое', hint: 'TradeMap, тонны.' },
  { id: '1516', label: '1516 · гидрогенизированные жиры', hint: 'TradeMap, тонны.' },
  { id: '1517', label: '1517 · маргарин и жировые смеси', hint: 'TradeMap, тонны.' },
  { id: 'sum', label: '1511+1513+1516+1517', hint: 'Сумма четырёх кодов; год считается, только если есть все четыре.' },
] as const;
type Code = typeof CODES[number]['id'];

const SCALE = ['крупнейший', 'крупный', 'средний', 'малый', 'не указан'];
const RELIABILITY = ['высокая', 'средняя', 'низкая'];
const PALETTE = ['#a87612', '#1e7a4c', '#3b6ea8', '#b23a2e', '#7a4fa0', '#2f8f8f', '#c06a1e', '#5a6b2f'];
const MAX_LINES = 8;

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
/** Тонны → «890 тыс. т» / «2,7 тыс. т» / «658 т». */
const fmtT = (v: number | undefined) =>
  v == null ? '—' : v >= 10000 ? `${nf.format(v / 1000)} тыс. т` : v >= 1000 ? `${nf1.format(v / 1000)} тыс. т` : `${nf.format(v)} т`;
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

function value(c: Country, code: Code, year: number): number | undefined {
  const y = String(year);
  if (code === '1511m') return c.suppliers1511?.find(s => s.name === 'Весь мир')?.t[y];
  const hs = c.trade?.hs;
  if (!hs) return undefined;
  if (code !== 'sum') return hs[code]?.[y];
  const parts = ['1511', '1513', '1516', '1517'].map(k => hs[k]?.[y]);
  return parts.every(v => v != null) ? parts.reduce((a, b) => a! + b!, 0) : undefined;
}

function yearsOf(countries: Country[]): number[] {
  const set = new Set<number>();
  for (const c of countries) {
    for (const s of Object.values(c.trade?.hs ?? {})) for (const y of Object.keys(s)) set.add(+y);
    for (const s of c.suppliers1511 ?? []) for (const y of Object.keys(s.t)) set.add(+y);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function downloadCsv(name: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ImportersDashboard({ countries }: { countries: Country[] }) {
  const years = useMemo(() => yearsOf(countries), [countries]);
  const withData = countries.filter(c => c.trade?.source || c.companies.length);
  const [sel, setSel] = useState<string[]>(withData.map(c => c.id));
  const [code, setCode] = useState<Code>('1511m');
  const [y0, setY0] = useState(2016);
  const [y1, setY1] = useState(years[years.length - 1] ?? 2025);
  const [lineMode, setLineMode] = useState<'countries' | 'total'>('countries');
  const [seg, setSeg] = useState<string[]>([]);
  const [scale, setScale] = useState<string[]>([]);
  const [rel, setRel] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(30);

  const picked = countries.filter(c => sel.includes(c.id));
  const range = years.filter(y => y >= y0 && y <= y1);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  // Страны по объёму в последнем году диапазона
  const ranked = useMemo(() => picked
    .map(c => ({ c, v: value(c, code, y1) }))
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1)), [picked, code, y1]);

  const lines = useMemo(() => {
    if (lineMode === 'total') {
      return [{
        name: 'Выбранные страны, сумма', color: PALETTE[0],
        points: range.map(y => {
          const vs = picked.map(c => value(c, code, y)).filter((v): v is number => v != null);
          return { x: y, y: vs.length ? vs.reduce((a, b) => a + b, 0) : undefined };
        }),
      }];
    }
    return ranked.filter(r => r.v != null || range.some(y => value(r.c, code, y) != null)).slice(0, MAX_LINES)
      .map((r, i) => ({ name: r.c.name, color: PALETTE[i], points: range.map(y => ({ x: y, y: value(r.c, code, y) })) }));
  }, [lineMode, ranked, picked, code, range]);
  const hiddenLines = lineMode === 'countries' ? Math.max(0, ranked.filter(r => range.some(y => value(r.c, code, y) != null)).length - MAX_LINES) : 0;

  // Поставщики 1511 по выбранным странам (зеркальные)
  const supYears = range.filter(y => picked.some(c => c.suppliers1511?.some(s => s.t[String(y)] != null)));
  const suppliers = useMemo(() => {
    const m = new Map<string, Record<number, number>>();
    for (const c of picked) for (const s of c.suppliers1511 ?? []) {
      if (s.name === 'Весь мир') continue;
      const row = m.get(s.name) ?? {};
      for (const y of supYears) { const v = s.t[String(y)]; if (v != null) row[y] = (row[y] ?? 0) + v; }
      m.set(s.name, row);
    }
    const last = supYears[supYears.length - 1];
    return Array.from(m.entries()).map(([name, t]) => ({ name, t, last: last != null ? t[last] ?? 0 : 0 }))
      .filter(s => supYears.some(y => s.t[y])).sort((a, b) => b.last - a.last);
  }, [picked, supYears]);
  const supLast = supYears[supYears.length - 1];
  const supTotal = suppliers.reduce((s, x) => s + x.last, 0);

  // Компании
  const companies = useMemo(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    const out: { c: Country; co: Company }[] = [];
    for (const c of picked) for (const co of c.companies) {
      if (seg.length && !co.segment.some(s => seg.includes(s))) continue;
      if (scale.length && !scale.includes(co.scale ?? 'не указан')) continue;
      if (rel.length && !rel.includes(co.reliability ?? '')) continue;
      if (toks.length) {
        const hay = norm([c.name, co.name, co.group, co.city, co.segment.join(' '), co.notes].join(' '));
        if (!toks.every(t => hay.includes(t))) continue;
      }
      out.push({ c, co });
    }
    return out.sort((a, b) => SCALE.indexOf(a.co.scale ?? 'не указан') - SCALE.indexOf(b.co.scale ?? 'не указан')
      || a.c.name.localeCompare(b.c.name, 'ru'));
  }, [picked, seg, scale, rel, q]);
  const allSegments = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of countries) for (const co of c.companies) for (const s of co.segment) m.set(s, (m.get(s) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [countries]);
  const segCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const { co } of companies) for (const s of co.segment) m.set(s, (m.get(s) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [companies]);

  const totalY1 = ranked.reduce((s, r) => s + (r.v ?? 0), 0);
  // Изменение — только по странам, у которых есть оба года
  const both = picked.map(c => [value(c, code, y0), value(c, code, y1)]).filter(([a, b]) => a != null && b != null) as number[][];
  const chgAll = both.length && y1 > y0 ? (both.reduce((s, [, b]) => s + b, 0) / both.reduce((s, [a]) => s + a, 0) - 1) * 100 : undefined;
  const codeInfo = CODES.find(c => c.id === code)!;

  return (
    <div className="space-y-10">
      {/* Фильтры */}
      <section aria-label="Фильтры" className="rounded border border-rule bg-panel p-4 space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-ink-3 mr-1">Страны</span>
            {[['Все', withData.map(c => c.id)], ['ЕС', EU], ['СНГ и Армения', CIS], ['Сбросить', []]].map(([l, ids]) => (
              <button key={l as string} type="button" onClick={() => setSel((ids as string[]).filter(id => countries.some(c => c.id === id)))}
                className="text-xs underline decoration-rule hover:text-gold">{l as string}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {countries.map(c => (
              <Chip key={c.id} on={sel.includes(c.id)} onClick={() => toggle(sel, setSel, c.id)}>{c.name}</Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="text-xs text-ink-3 block">Код ТН ВЭД
            <select value={code} onChange={e => setCode(e.target.value as Code)}
              className="mt-1 block w-full rounded border border-rule bg-paper px-2 py-1.5 text-sm text-ink">
              {CODES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span className="mt-1 block">{codeInfo.hint}</span>
          </label>
          <div className="text-xs text-ink-3">Годы
            <div className="mt-1 flex items-center gap-2">
              <select aria-label="С года" value={y0} onChange={e => { const v = +e.target.value; setY0(v); if (v > y1) setY1(v); }}
                className="rounded border border-rule bg-paper px-2 py-1.5 text-sm text-ink num">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span>—</span>
              <select aria-label="По год" value={y1} onChange={e => { const v = +e.target.value; setY1(v); if (v < y0) setY0(v); }}
                className="rounded border border-rule bg-paper px-2 py-1.5 text-sm text-ink num">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChipGroup label="Сегмент" all={allSegments} on={seg} onToggle={v => toggle(seg, setSeg, v)} onClear={() => setSeg([])} />
          <ChipGroup label="Масштаб" all={SCALE} on={scale} onToggle={v => toggle(scale, setScale, v)} onClear={() => setScale([])} />
          <ChipGroup label="Достоверность" all={RELIABILITY} on={rel} onToggle={v => toggle(rel, setRel, v)} onClear={() => setRel([])} />
        </div>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск компании, бренда, города"
          aria-label="Поиск по компаниям" className="w-full sm:w-80 rounded border border-rule bg-paper px-3 py-1.5 text-sm" />
      </section>

      {/* Сводка */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Стран выбрано" value={String(picked.length)} />
        <Kpi label={`Импорт ${y1}, ${code === 'sum' ? 'сумма кодов' : code.replace('m', '')}`} value={fmtT(totalY1 || undefined)} />
        <Kpi label={`Изменение с ${y0} г.`} value={chgAll == null || !isFinite(chgAll) ? '—' : `${chgAll >= 0 ? '+' : '−'}${nf1.format(Math.abs(chgAll))}%`}
          note={both.length < picked.length ? `по ${both.length} из ${picked.length} стран, где есть оба года` : undefined} />
        <Kpi label="Компаний по фильтрам" value={String(companies.length)} />
      </dl>

      {picked.length === 0 ? (
        <p className="py-10 text-center text-ink-3 border border-dashed border-rule rounded">Выберите хотя бы одну страну.</p>
      ) : (
        <>
          {/* Динамика */}
          <section aria-labelledby="dyn-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 id="dyn-title" className="font-cond text-2xl font-semibold tracking-tight">Импорт по годам</h2>
              <div role="group" aria-label="Вид графика" className="flex gap-1 text-xs">
                <Chip on={lineMode === 'countries'} onClick={() => setLineMode('countries')}>по странам</Chip>
                <Chip on={lineMode === 'total'} onClick={() => setLineMode('total')}>сумма</Chip>
              </div>
            </div>
            <LineChart series={lines} years={range} />
            {hiddenLines > 0 && <p className="mt-1 text-xs text-ink-3">Показаны {MAX_LINES} крупнейших стран; ещё {hiddenLines} — в таблице ниже.</p>}
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="rank-title">
              <h2 id="rank-title" className="font-cond text-2xl font-semibold tracking-tight mb-3">Страны в {y1} г.</h2>
              <BarList rows={ranked.map(r => ({ label: r.c.name, value: r.v }))} fmt={fmtT} />
            </section>
            <section aria-labelledby="sup-title">
              <h2 id="sup-title" className="font-cond text-2xl font-semibold tracking-tight mb-1">Поставщики 1511{supLast ? ` в ${supLast} г.` : ''}</h2>
              <p className="text-xs text-ink-3 mb-3">Зеркальные данные по выбранным странам, сумма. Европейские страны часто — перевалка, а не происхождение масла.</p>
              {suppliers.length ? (
                <BarList rows={suppliers.slice(0, 12).map(s => ({ label: s.name, value: s.last, note: supTotal ? `${nf1.format(s.last / supTotal * 100)}%` : undefined }))} fmt={fmtT} />
              ) : <p className="text-sm text-ink-3">Нет данных за выбранные годы.</p>}
            </section>
          </div>

          {/* Таблица стран */}
          <section aria-labelledby="ct-title">
            <TableHead id="ct-title" title="Сравнение стран" onCsv={() => downloadCsv(`импорт-${code}-${y0}-${y1}.csv`, [
              ['Страна', 'Источник', ...range.map(String), `Изм. ${y0}–${y1}, %`, 'Малайзия, %', 'Индонезия, %', 'Компаний'],
              ...ranked.map(({ c }) => countryRow(c, code, range, supLast).map(v => typeof v === 'number' ? Math.round(v * 10) / 10 : v)),
            ])} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Импорт по странам, {codeInfo.label}, тонны</caption>
                <thead>
                  <tr className="text-xs text-ink-3 border-b border-rule text-right">
                    <th scope="col" className="py-2 pr-4 font-normal text-left">Страна</th>
                    {range.map(y => <th key={y} scope="col" className="py-2 px-2 font-normal num">{y}</th>)}
                    <th scope="col" className="py-2 px-2 font-normal">Изм.</th>
                    <th scope="col" className="py-2 px-2 font-normal" title="Доля в поставках 1511, зеркальные данные">MY / ID</th>
                    <th scope="col" className="py-2 pl-2 font-normal">Компаний</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {ranked.map(({ c }) => {
                    const [, src, ...rest] = countryRow(c, code, range, supLast);
                    const vals = rest.slice(0, range.length) as (number | undefined)[];
                    const [chg, my, id, n] = rest.slice(range.length) as (number | undefined)[];
                    return (
                      <tr key={c.id} className="text-right num">
                        <th scope="row" className="py-2 pr-4 text-left font-normal whitespace-nowrap">
                          {c.name}{src === 'зеркальные' && code !== '1511m' && <span className="text-xs text-ink-3"> · зерк.</span>}
                        </th>
                        {vals.map((v, i) => <td key={range[i]} className="py-2 px-2 whitespace-nowrap">{v == null ? '—' : (v < 10000 ? nf1 : nf).format(v / 1000)}</td>)}
                        <td className={`py-2 px-2 whitespace-nowrap ${chg == null ? '' : chg >= 0 ? 'text-up' : 'text-down'}`}>
                          {chg == null ? '—' : `${chg >= 0 ? '+' : '−'}${nf.format(Math.abs(chg))}%`}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{my == null ? '—' : `${nf.format(my)} / ${nf.format(id ?? 0)}`}</td>
                        <td className="py-2 pl-2">{n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-ink-3">Значения по годам — тыс. т. «Изм.» — от первого до последнего года диапазона, где есть данные. MY / ID — доли Малайзии и Индонезии в поставках 1511 в {supLast ?? y1} г., %.</p>
            </div>
          </section>

          {/* Таблица поставщиков */}
          {suppliers.length > 0 && (
            <section aria-labelledby="st-title">
              <TableHead id="st-title" title="Поставщики 1511 по годам" onCsv={() => downloadCsv(`поставщики-1511-${y0}-${y1}.csv`, [
                ['Поставщик', ...supYears.map(String)], ...suppliers.map(s => [s.name, ...supYears.map(y => s.t[y])]),
              ])} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Поставщики пальмового масла (1511) в выбранные страны, тонны</caption>
                  <thead>
                    <tr className="text-xs text-ink-3 border-b border-rule text-right">
                      <th scope="col" className="py-2 pr-4 font-normal text-left">Поставщик</th>
                      {supYears.map(y => <th key={y} scope="col" className="py-2 px-2 font-normal num">{y}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {suppliers.slice(0, 15).map(s => (
                      <tr key={s.name} className="text-right num">
                        <th scope="row" className="py-2 pr-4 text-left font-normal">{s.name}</th>
                        {supYears.map(y => <td key={y} className="py-2 px-2 whitespace-nowrap">{s.t[y] ? nf1.format(s.t[y] / 1000) : '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-xs text-ink-3">Тыс. т. Показаны 15 крупнейших поставщиков; полный список — в CSV.</p>
              </div>
            </section>
          )}

          {/* Компании */}
          <section aria-labelledby="co-title" className="grid gap-10 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="font-cond text-2xl font-semibold tracking-tight mb-3">Компании по сегментам</h2>
              {segCounts.length ? <BarList rows={segCounts.map(([s, n]) => ({ label: s, value: n }))} fmt={v => String(v ?? 0)} /> : <p className="text-sm text-ink-3">Нет компаний.</p>}
            </div>
            <div className="min-w-0">
              <TableHead id="co-title" title={`Компании: ${companies.length}`} onCsv={() => downloadCsv('компании.csv', [
                ['Страна', 'Компания', 'Сегмент', 'Масштаб', 'Объём / масштаб (источник)', 'Достоверность', 'Сайт', 'Примечание', 'Источники'],
                ...companies.map(({ c, co }) => [c.name, co.name, co.segment.join(', '), co.scale, co.volume, co.reliability, co.website, co.notes, co.sources?.join(' ')]),
              ])} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <caption className="sr-only">Компании-покупатели по выбранным фильтрам</caption>
                  <thead>
                    <tr className="text-xs text-ink-3 border-b border-rule text-left">
                      <th scope="col" className="py-2 pr-3 font-normal">Компания</th>
                      <th scope="col" className="py-2 px-3 font-normal">Страна</th>
                      <th scope="col" className="py-2 px-3 font-normal">Сегмент</th>
                      <th scope="col" className="py-2 px-3 font-normal">Масштаб</th>
                      <th scope="col" className="py-2 pl-3 font-normal">Достов.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {companies.slice(0, shown).map(({ c, co }) => (
                      <tr key={c.id + co.name} className="align-top">
                        <th scope="row" className="py-2 pr-3 text-left font-normal">
                          <span className="block font-medium">
                            {co.website ? <a href={co.website} target="_blank" rel="noopener noreferrer" className="hover:text-gold">{co.name}</a> : co.name}
                          </span>
                          {co.volume && <span className="block text-xs text-ink-3">{co.volume}</span>}
                        </th>
                        <td className="py-2 px-3 whitespace-nowrap">{c.name}</td>
                        <td className="py-2 px-3 text-ink-2">{co.segment.join(', ')}</td>
                        <td className="py-2 px-3 text-ink-2 whitespace-nowrap">{co.scale}</td>
                        <td className="py-2 pl-3 text-ink-2">{co.reliability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {companies.length === 0 && <p className="py-6 text-center text-ink-3">Ничего не найдено.</p>}
                {companies.length > shown && (
                  <button type="button" onClick={() => setShown(shown + 50)}
                    className="mt-3 w-full rounded border border-rule py-2 text-sm text-ink-2 hover:border-ink-3">
                    Показать ещё ({companies.length - shown})
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Строка таблицы стран: [страна, источник, …значения по годам, изм. %, MY %, ID %, компаний]. */
function countryRow(c: Country, code: Code, range: number[], supYear?: number): (string | number | undefined)[] {
  const vals = range.map(y => value(c, code, y));
  const known = vals.map((v, i) => ({ v, y: range[i] })).filter(x => x.v != null);
  const chg = known.length > 1 && known[0].v ? (known[known.length - 1].v! / known[0].v - 1) * 100 : undefined;
  const sup = c.suppliers1511 ?? [];
  const world = supYear != null ? sup.find(s => s.name === 'Весь мир')?.t[String(supYear)] : undefined;
  const share = (n: string) => world && supYear != null ? (sup.find(s => s.name === n)?.t[String(supYear)] ?? 0) / world * 100 : undefined;
  return [c.name, c.trade?.source === 'mirror' ? 'зеркальные' : c.trade?.source === 'country' ? 'данные страны' : '',
    ...vals, chg, share('Малайзия'), share('Индонезия'), c.companies.length];
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${on ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-2 hover:border-ink-3'}`}>
      {children}
    </button>
  );
}

function ChipGroup({ label, all, on, onToggle, onClear }: { label: string; all: string[]; on: string[]; onToggle: (v: string) => void; onClear: () => void }) {
  return (
    <div>
      <div className="text-xs text-ink-3 mb-1.5">{label}
        {on.length > 0 && <button type="button" onClick={onClear} className="ml-2 underline decoration-rule hover:text-gold">все</button>}
      </div>
      <div className="flex flex-wrap gap-1.5">{all.map(v => <Chip key={v} on={on.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>)}</div>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t-2 border-ink pt-2">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="font-cond text-2xl font-semibold num">{value}</dd>
      {note && <dd className="text-[11px] text-ink-3">{note}</dd>}
    </div>
  );
}

function TableHead({ id, title, onCsv }: { id: string; title: string; onCsv: () => void }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <h2 id={id} className="font-cond text-2xl font-semibold tracking-tight">{title}</h2>
      <button type="button" onClick={onCsv} className="text-xs underline decoration-rule hover:text-gold whitespace-nowrap">Скачать CSV</button>
    </div>
  );
}

function BarList({ rows, fmt }: { rows: { label: string; value?: number; note?: string }[]; fmt: (v?: number) => string }) {
  const max = Math.max(...rows.map(r => r.value ?? 0), 1);
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map(r => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
          <span className="truncate" title={r.label}>{r.label}</span>
          <span className="h-3 bg-rule rounded-sm overflow-hidden" aria-hidden="true">
            <span className="block h-full bg-gold rounded-sm" style={{ width: `${((r.value ?? 0) / max) * 100}%` }} />
          </span>
          <span className="num text-xs text-ink-2 whitespace-nowrap text-right min-w-[5.5rem]">
            {r.value == null ? 'нет данных' : fmt(r.value)}{r.note && <span className="text-ink-3"> · {r.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

type Series = { name: string; color: string; points: { x: number; y?: number }[] };

function LineChart({ series, years }: { series: Series[]; years: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000, H = 340, L = 64, R = 12, T = 10, B = 26;
  const all = series.flatMap(s => s.points.map(p => p.y)).filter((v): v is number => v != null);
  if (years.length < 2 || !all.length) return <p className="text-sm text-ink-3 py-10 text-center border border-dashed border-rule rounded">Нет данных для графика: выберите другой код или годы.</p>;
  const max = niceMax(Math.max(...all));
  const x = (yr: number) => L + ((yr - years[0]) / (years[years.length - 1] - years[0])) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max);
  const path = (s: Series) => {
    let d = '', pen = false;
    for (const p of s.points) {
      if (p.y == null) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (years.length - 1));
    setHover(years[Math.max(0, Math.min(years.length - 1, i))]);
  };
  const hv = hover != null ? series.map(s => ({ s, v: s.points.find(p => p.x === hover)?.y })).filter(r => r.v != null).sort((a, b) => b.v! - a.v!) : [];

  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" onMouseMove={onMove} onMouseLeave={() => setHover(null)}
          aria-label={`Импорт по годам, ${years[0]}–${years[years.length - 1]}: ${series.map(s => s.name).join(', ')}`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
              <text x={L - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmtAxis(t)}</text>
            </g>
          ))}
          {years.map((yr, i) => (years.length <= 12 || i % 2 === 0 || i === years.length - 1) && (
            <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">{yr}</text>
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--ink-3)" strokeDasharray="3 3" />}
          {series.map(s => (
            <g key={s.name}>
              <path d={path(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              {s.points.map(p => p.y != null && (
                <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={hover === p.x ? 4 : 2.5} fill={s.color} />
              ))}
            </g>
          ))}
        </svg>
        {hover != null && hv.length > 0 && (
          <div className="pointer-events-none absolute top-2 rounded border border-rule bg-paper px-3 py-2 text-xs shadow-sm"
            style={x(hover) > W / 2 ? { left: '4rem' } : { right: '1rem' }}>
            <div className="font-medium mb-1 num">{hover}</div>
            {hv.map(({ s, v }) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="flex-1">{s.name}</span><span className="num">{fmtT(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map(s => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ background: s.color }} />{s.name}
          </span>
        ))}
        <span className="text-ink-3">· ось — тонны; разрыв линии = нет данных за год</span>
      </figcaption>
    </figure>
  );
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v) ?? v;
}
const fmtAxis = (v: number) => v >= 1e6 ? `${nf1.format(v / 1e6)} млн` : v >= 1000 ? `${nf.format(v / 1000)} тыс.` : nf.format(v);
