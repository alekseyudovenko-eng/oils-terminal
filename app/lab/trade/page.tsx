// /lab/trade — закрытая страница «Лаборатории IMA»: импорт масел по данным Global Trade Tracker.
// Данные GTT лицензированы и показываются только здесь, под паролем лаборатории.
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import TradeExplorer from '@/components/TradeExplorer';
import { mergeTrade } from '@/lib/trade-merge';
import { getTrade, getTradeExtra } from '@/lib/gtt-data';
import { GTT_HS, GTT_REPORTERS } from '@/lib/gtt-meta';
import { getLabDict } from '@/lib/lab-i18n';
import { fill } from '@/lib/dict';
import { INTL } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  const { L } = getLabDict();
  return { title: `${L.trade.meta} · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}
export const revalidate = 3600;

export default async function TradePage() {
  const { rows, updatedAt } = await getTrade();
  const { lang, L } = getLabDict();
  const T = L.trade;
  // Названия стран — по коду ISO на языке страницы (в GTT Сербия — XS); служебные коды GTT — свои подписи.
  const dn = new Intl.DisplayNames([INTL[lang]], { type: 'region' });
  const SPECIAL: Record<string, string> = { QU: T.unspecified, QV: T.unspecified, QW: T.unspecified, Q1: T.otherEurope };
  const region = (code: string, fallback?: string | null) => {
    if (SPECIAL[code]) return SPECIAL[code];
    const iso = code === 'XS' ? 'RS' : code;
    if (/^[A-Z]{2}$/.test(iso) && iso !== 'AN') {
      try { const n = dn.of(iso); if (n && n !== iso) return n; } catch { /* нет в справочнике */ }
    }
    return fallback || code;
  };

  // Источники сведены в один ряд: таможня страны (GTT) → данные экспортёров (UN Comtrade + зеркальные GTT).
  const { status, comtrade } = await getTradeExtra();
  const data = mergeTrade(rows, status, comtrade, GTT_REPORTERS, region);

  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  return (
    <>
      <LabHeader current="/lab/trade" note={getDict().t.lab.notes.trade} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{T.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            {T.lead}
          </p>
          <p className="mt-2 text-sm text-ink-2 max-w-[70ch]">
            {T.russia}
          </p>
          <p className="mt-1 text-xs text-ink-3">{updated ? fill(T.loaded, { d: updated }) : ''}{T.monthly}</p>
        </section>
        <TradeExplorer data={data} lang={lang} L={T}
          countries={GTT_REPORTERS.map(c => ({ code: c.code, name: lang === 'ru' ? c.name : region(c.code, c.name) }))}
          hs={GTT_HS.map(h => ({ code: h.code, label: T.hs[h.code as keyof typeof T.hs] ?? h.label }))} />
      </main>
    </>
  );
}
