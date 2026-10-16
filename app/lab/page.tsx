// /lab — закрытая «Лаборатория IMA»: черновик прогноза цены пальмового масла.
// Доступ только по паролю (middleware.ts), в меню сайта ссылки нет.
import type { Metadata } from 'next';
import Link from 'next/link';
import Section from '@/components/Section';
import forecast from '@/data/forecast.json';
import { fmtInt } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Лаборатория IMA',
  robots: { index: false, follow: false },
};

type Range = { low: number; high: number; point?: number; prob: number };
type Horizon = {
  id: string; name: string; period: string;
  scenarios: { bear: Range; base: Range; bull: Range };
  ensemble: { source: string; value: number; weight: number }[];
  drivers: { bear: string; base: string; bull: string };
  triggers: string[];
};

const F = forecast as unknown as {
  label: string; asOf: string; benchmark: string;
  spot: { myr: number; usd: number; usdmyr: number; note: string };
  horizons: Horizon[];
  backtest: { period: string; note: string; rows: { h: number; rmseRw: number; rmseModel: number; hit: number; skill: number }[] };
  elNino: { note: string; current: string; rows: { start: string; oni: number; after6: number | null; after12: number | null }[] };
  curve: { capturedAt: string; note: string; points: { m: string; v: number }[] };
  external: { who: string; date: string; view: string; url: string }[];
  method: string[];
};

const SC = [
  { id: 'bear', name: 'Медвежий' },
  { id: 'base', name: 'Базовый' },
  { id: 'bull', name: 'Бычий' },
] as const;

const usd = (myr: number) => fmtInt(myr / F.spot.usdmyr);
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`);
const date = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function CurveChart() {
  const pts = F.curve.points;
  const W = 720, H = 200, PL = 44, PR = 8, PT = 10, PB = 26;
  const vals = pts.map(p => p.v).concat(F.spot.myr);
  const min = Math.floor(Math.min(...vals) / 100) * 100 - 100;
  const max = Math.ceil(Math.max(...vals) / 100) * 100 + 100;
  const x = (i: number) => PL + (i / (pts.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const ticks = [min + 100, Math.round((min + max) / 200) * 100, max - 100];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const peak = pts.reduce((a, b) => (b.v > a.v ? b : a));
  const peakI = pts.indexOf(peak);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Кривая фьючерсов FCPO: от ${fmtInt(pts[0].v)} в ${pts[0].m} до пика ${fmtInt(peak.v)} в ${peak.m}`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
            <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmtInt(t)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
        {pts.map((p, i) => <circle key={p.m} cx={x(i)} cy={y(p.v)} r="2.5" fill="var(--gold)" />)}
        <text x={x(peakI)} y={y(peak.v) - 8} textAnchor="middle" fontSize="11" fill="var(--ink)">{fmtInt(peak.v)}</text>
        {pts.map((p, i) => (i % 2 === 0 ? <text key={p.m} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--ink-3)">{p.m}</text> : null))}
      </svg>
      <figcaption className="mt-1 text-xs text-ink-3">MYR/т, цены закрытия на {date(F.curve.capturedAt)}. {F.curve.note}</figcaption>
    </figure>
  );
}

export default function LabPage() {
  return (
    <>
      <header className="bg-band text-band-text">
        <div className="mx-auto max-w-page px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <span className="font-cond text-xl font-semibold tracking-tight">Лаборатория IMA</span>
          <Link href="/" className="text-sm text-band-muted hover:text-band-text">На сайт</Link>
        </div>
      </header>
      <p className="bg-gold-soft text-ink text-sm">
        <span className="mx-auto max-w-page px-4 sm:px-6 py-2 block">
          Закрытая страница: её видят только те, у кого есть пароль. {F.label}
        </span>
      </p>

      <main className="mx-auto max-w-page w-full px-4 sm:px-6">
        <section aria-labelledby="fc-title" className="py-8 border-b border-rule">
          <h1 id="fc-title" className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">Прогноз цены пальмового масла</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">
            {F.benchmark}. Отправная точка: {fmtInt(F.spot.myr)} MYR/т (≈ ${fmtInt(F.spot.usd)}) — {F.spot.note}.
            Оценка от {date(F.asOf)}.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <caption className="sr-only">Диапазоны цены по горизонтам и сценариям, MYR за тонну</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">Горизонт</th>
                  {SC.map(s => (
                    <th key={s.id} scope="col" className={`py-2 px-4 text-left font-normal ${s.id === 'base' ? 'text-ink' : ''}`}>{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.horizons.map(h => (
                  <tr key={h.id}>
                    <th scope="row" className="py-4 pr-4 text-left align-top font-normal">
                      <a href={`#${h.id}`} className="font-medium text-ink hover:text-gold">{h.name}</a>
                      <span className="block text-xs text-ink-3">{h.period}</span>
                    </th>
                    {SC.map(s => {
                      const r = h.scenarios[s.id];
                      return (
                        <td key={s.id} className={`py-4 px-4 align-top ${s.id === 'base' ? 'bg-gold-soft/60' : ''}`}>
                          <span className={`block font-cond num ${s.id === 'base' ? 'text-2xl font-semibold' : 'text-xl font-medium'}`}>
                            {fmtInt(r.low)}–{fmtInt(r.high)}
                          </span>
                          <span className="block text-xs text-ink-3 num">${usd(r.low)}–{usd(r.high)} · вероятность {r.prob}%</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {F.horizons.map(h => (
          <Section key={h.id} id={h.id} title={`${h.name}: ${h.period.toLowerCase()}`}>
            <div className="grid gap-6 lg:grid-cols-3">
              {SC.map(s => (
                <div key={s.id} className={s.id === 'base' ? 'lg:order-none' : ''}>
                  <h3 className="font-cond text-lg font-semibold">
                    {s.name} <span className="text-sm font-normal text-ink-3 num">{fmtInt(h.scenarios[s.id].low)}–{fmtInt(h.scenarios[s.id].high)}</span>
                  </h3>
                  <p className="mt-1 text-sm text-ink-2 leading-relaxed">{h.drivers[s.id]}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="font-cond text-lg font-semibold mb-2">Что сдвинет сценарий</h3>
                <ul className="text-sm text-ink-2 list-disc pl-5 space-y-1">
                  {h.triggers.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-cond text-lg font-semibold mb-2">Из чего сложен базовый сценарий</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-rule">
                    {h.ensemble.map(e => (
                      <tr key={e.source}>
                        <td className="py-1.5 pr-3 text-ink-2">{e.source}</td>
                        <td className="py-1.5 px-3 text-right num">{fmtInt(e.value)}</td>
                        <td className="py-1.5 pl-3 text-right num text-ink-3">{Math.round(e.weight * 100)}%</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-1.5 pr-3">Итог (взвешенное среднее)</td>
                      <td className="py-1.5 px-3 text-right num">{fmtInt(h.scenarios.base.point ?? 0)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        ))}

        <Section id="curve" title="Что закладывает рынок" note="Цены фьючерсов FCPO по месяцам поставки. Рост к середине 2027 года — ожидание дефицита из-за Эль-Ниньо, снижение к 2028 году — ожидание восстановления урожая.">
          <CurveChart />
        </Section>

        <Section id="elnino" title="Эль-Ниньо: что было раньше" note={`${F.elNino.current} ${F.elNino.note}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-xl">
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">Начало</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">ONI</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">Через 6 мес.</th>
                  <th scope="col" className="py-2 pl-3 text-right font-normal">Через 12 мес.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.elNino.rows.map(r => (
                  <tr key={r.start} className={r.after6 == null ? 'bg-gold-soft/60' : ''}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{r.start}</th>
                    <td className="py-2 px-3 text-right num">{r.oni.toLocaleString('ru-RU')}</td>
                    <td className="py-2 px-3 text-right num">{r.after6 == null ? 'сейчас' : pct(r.after6)}</td>
                    <td className="py-2 pl-3 text-right num">{pct(r.after12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="accuracy" title="Насколько можно верить модели" note={F.backtest.note}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm max-w-2xl">
              <caption className="text-left text-xs text-ink-3 pb-2">Проверка на истории: {F.backtest.period}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">Горизонт</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">Ошибка «цена не изменится»</th>
                  <th scope="col" className="py-2 px-3 text-right font-normal">Ошибка модели</th>
                  <th scope="col" className="py-2 pl-3 text-right font-normal">Угадано направление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {F.backtest.rows.map(r => (
                  <tr key={r.h}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{r.h} мес.</th>
                    <td className="py-2 px-3 text-right num">±{r.rmseRw.toLocaleString('ru-RU')}%</td>
                    <td className={`py-2 px-3 text-right num ${r.skill > 0 ? 'text-up' : 'text-down'}`}>±{r.rmseModel.toLocaleString('ru-RU')}%</td>
                    <td className="py-2 pl-3 text-right num">{r.hit}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="external" title="Что прогнозируют другие">
          <ul className="divide-y divide-rule text-sm">
            {F.external.map(e => (
              <li key={e.who} className="py-2.5 grid sm:grid-cols-[14rem_1fr] gap-x-6 gap-y-0.5">
                <span className="font-medium">{e.who} <span className="block text-xs font-normal text-ink-3">{date(e.date)}</span></span>
                <span className="text-ink-2">
                  {e.view}. <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-ink-3 underline underline-offset-2 hover:text-gold">Источник</a>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="method" title="Как считали">
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-ink-2 max-w-[80ch]">
            {F.method.map(m => <li key={m}>{m}</li>)}
          </ol>
          <p className="mt-4 text-xs text-ink-3">Аналитическая оценка IMA. Не является инвестиционной рекомендацией.</p>
        </Section>
      </main>
    </>
  );
}
