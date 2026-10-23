// /lab/trade — закрытая страница «Лаборатории IMA»: импорт масел по данным Global Trade Tracker.
// Данные GTT лицензированы и показываются только здесь, под паролем лаборатории.
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import TradeExplorer, { type TradeData, type SeriesPoint, type Supplier } from '@/components/TradeExplorer';
import { getTrade } from '@/lib/gtt-data';
import { GTT_HS, GTT_REPORTERS } from '@/lib/gtt-meta';

export const metadata: Metadata = { title: 'Импорт масел (GTT) · Лаборатория IMA', robots: { index: false, follow: false } };
export const revalidate = 3600;

export default async function TradePage() {
  const { rows, updatedAt } = await getTrade();

  // Свод: страна → код → помесячно (всего / Малайзия / Индонезия) и поставщики по годам.
  const data: TradeData = {};
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.reporter}|${r.hs}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  for (const [k, list] of Array.from(groups.entries())) {
    const [rep, hs] = k.split('|');
    const months = new Map<string, SeriesPoint>();
    for (const r of list) {
      const ym = `${r.year}-${String(r.month).padStart(2, '0')}`;
      const p = months.get(ym) ?? { ym, t: 0, my: 0, id: 0, usd: 0 };
      const t = r.qty_t ?? 0;
      p.t += t; p.usd += r.value_usd ?? 0;
      if (r.partner === 'MY') p.my += t;
      if (r.partner === 'ID') p.id += t;
      months.set(ym, p);
    }
    // Непрерывный ряд месяцев: пропуски = 0.
    const keys = Array.from(months.keys()).sort();
    const series: SeriesPoint[] = [];
    if (keys.length) {
      let [y, m] = keys[0].split('-').map(Number);
      const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
      while (y * 12 + m <= ly * 12 + lm) {
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        series.push(months.get(ym) ?? { ym, t: 0, my: 0, id: 0, usd: 0 });
        m++; if (m > 12) { m = 1; y++; }
      }
    }
    const last12 = new Set(series.slice(-12).map(p => p.ym));
    const sup = new Map<string, Supplier>();
    for (const r of list) {
      const name = r.partner_name || r.partner;
      const s = sup.get(name) ?? { name, byYear: {}, last12: 0 };
      const t = r.qty_t ?? 0;
      s.byYear[String(r.year)] = (s.byYear[String(r.year)] ?? 0) + t;
      if (last12.has(`${r.year}-${String(r.month).padStart(2, '0')}`)) s.last12 += t;
      sup.set(name, s);
    }
    const years = Array.from(new Set(list.map(r => String(r.year)))).sort();
    (data[rep] ??= {})[hs] = {
      months: series,
      suppliers: Array.from(sup.values()).sort((a, b) => b.last12 - a.last12 || (b.byYear[years[years.length - 1]] ?? 0) - (a.byYear[years[years.length - 1]] ?? 0)),
      years,
    };
  }

  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  return (
    <>
      <LabHeader current="/lab/trade" note={getDict().t.lab.notes.trade} />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">Импорт масел и жиров по странам</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            Месячный импорт по кодам ТН ВЭД 1511–1517 по данным таможни стран (Global Trade Tracker). Если страна не
            публикует данные за какие-то месяцы, они дополнены зеркальной статистикой — по экспорту стран-поставщиков.
          </p>
          <p className="mt-2 text-sm text-ink-2 max-w-[70ch]">
            Россия: собственная таможенная статистика в GTT есть только до марта 2025 года, дальше — зеркальные данные.
            Они не видят поставки через третьи страны (например, через ОАЭ или Европу), поэтому импорт с апреля 2025 года
            занижен, а доля прямых поставщиков (Индонезия, Малайзия) завышена.
          </p>
          <p className="mt-1 text-xs text-ink-3">{updated ? `Загружено ${updated}. ` : ''}Обновляется раз в месяц.</p>
        </section>
        <TradeExplorer data={data} countries={GTT_REPORTERS} hs={GTT_HS} />
      </main>
    </>
  );
}
