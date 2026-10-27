// /lab/trade — закрытая страница «Лаборатории IMA»: импорт масел по данным Global Trade Tracker.
// Данные GTT лицензированы и показываются только здесь, под паролем лаборатории.
import type { Metadata } from 'next';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import TradeExplorer from '@/components/TradeExplorer';
import { mergeCountry } from '@/lib/trade-merge';
import { partnerNamer } from '@/lib/trade-names';
import { getCountryTrade, getTradeIndex } from '@/lib/gtt-data';
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
  const { lang, L } = getLabDict();
  const T = L.trade;
  // Сразу загружаем одну страну (первую из списка, по которой есть данные); остальные — по запросу.
  const { reporters, updatedAt } = await getTradeIndex();
  const countries = GTT_REPORTERS.filter(c => reporters.includes(c.code));
  const namer = partnerNamer(lang, T.unspecified, T.otherEurope);
  const first = countries[0]?.code ?? '';
  const initial = first ? (async () => {
    const { rows, status, comtrade } = await getCountryTrade(first);
    return mergeCountry(rows, status, comtrade, namer);
  })() : Promise.resolve({});

  const updated = updatedAt ? new Date(updatedAt).toLocaleDateString(INTL[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  return (
    <>
      <LabHeader current="/lab/trade" note={getDict().t.lab.notes.trade} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{T.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">{T.lead}</p>
          <p className="mt-2 text-sm text-ink-2 max-w-[70ch]">{T.russia}</p>
          <p className="mt-1 text-xs text-ink-3">{updated ? fill(T.loaded, { d: updated }) : ''}{T.monthly}</p>
        </section>
        <TradeExplorer initialCode={first} initial={await initial} lang={lang} L={T}
          countries={countries.map(c => ({ code: c.code, name: lang === 'ru' ? c.name : namer(c.code, c.name) }))}
          hs={GTT_HS.map(h => ({ code: h.code, label: T.hs[h.code as keyof typeof T.hs] ?? h.label }))} />
      </main>
    </>
  );
}
