// Главный блок обзора: FCPO и POGO крупно, рядом нефть и соя.
import Change from './Change';
import { fmtPrice, fmtSigned } from '@/lib/format';
import type { QuotesResult } from '@/lib/quotes';

export default function Hero({ data }: { data: QuotesResult }) {
  const q = (id: string) => data.quotes.find(x => x.id === id);
  const fcpo = q('fcpo');
  const pogo = data.spreads.find(s => s.id === 'pogo');
  const side = ['zl', 'brent', 'gasoil', 'ulsd'].map(q).filter(x => x && x.price != null).slice(0, 3);

  return (
    <section aria-labelledby="hero-title" className="border-b border-rule bg-panel">
      <h1 id="hero-title" className="sr-only">Обзор рынка растительных масел</h1>
      <div className="mx-auto max-w-page px-4 sm:px-6 py-8 grid gap-8 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        <div>
          <p className="text-sm text-ink-2">Пальмовое масло FCPO, {fcpo?.venue}</p>
          <p className="mt-1 font-cond font-semibold leading-none text-[clamp(3rem,8vw,5.5rem)] num text-ink">
            {fmtPrice(fcpo?.price)}
            <span className="ml-2 text-2xl font-medium text-ink-3">MYR/т</span>
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg">
            <Change value={fcpo?.changePct ?? null} arrow />
            <span className="text-ink-2 num">≈ ${fmtPrice(fcpo?.usdT)} за тонну</span>
          </p>
        </div>

        <div className="lg:border-l lg:border-rule lg:pl-8">
          <p className="text-sm text-ink-2">Спред POGO: пальма минус газойль</p>
          <p className={`mt-1 font-cond font-semibold leading-none text-[clamp(2.75rem,6vw,4.5rem)] num ${pogo?.value == null ? 'text-ink-3' : 'text-gold'}`}>
            {pogo?.value == null ? '—' : fmtSigned(pogo.value)}
            <span className="ml-2 text-xl font-medium text-ink-3">$/т</span>
          </p>
          <p className="mt-3 text-sm text-ink-2 max-w-[38ch]">
            {pogo?.explain ?? 'Спред появится, когда будут доступны цены FCPO и газойля.'}
            {pogo?.change != null && <> За день: <Change value={pogo.change} kind="abs" /> $/т.</>}
          </p>
          {pogo?.proxy && <p className="mt-2 text-xs text-ink-3">Газойль оценён по дизелю ULSD (NYMEX), пересчёт в тонны.</p>}
        </div>

        <ul className="grid gap-4 content-start lg:border-l lg:border-rule lg:pl-8">
          {side.map(x => x && (
            <li key={x.id} className="flex items-baseline justify-between gap-4">
              <span>
                <span className="block text-sm text-ink">{x.name}</span>
                <span className="block text-xs text-ink-3">{x.venue}</span>
              </span>
              <span className="text-right">
                <span className="block font-cond text-xl font-medium num">{fmtPrice(x.price)}</span>
                <span className="block text-xs"><Change value={x.changePct} /> <span className="text-ink-3">{x.unit}</span></span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
