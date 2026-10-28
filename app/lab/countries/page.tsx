// /lab/countries — закрытый обзор стран: сравнительная таблица и ссылки на страницы стран.
import type { Metadata } from 'next';
import Link from 'next/link';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import { getLabDict } from '@/lib/lab-i18n';
import { fill } from '@/lib/dict';
import { COUNTRIES_DICT } from '@/lib/dict-countries';
import { ACTIVE, MONITORED, profileOf, type Rating } from '@/lib/countries';
import { getFx, getMacro } from '@/lib/country-data';
import { getCountryTrade } from '@/lib/gtt-data';
import { mergeCountry } from '@/lib/trade-merge';
import { partnerNamer } from '@/lib/trade-names';
import { summarizeTrade } from '@/lib/country-trade';
import { nf, pct, signed, usdBn, usd, people, tonnes, share, yoy } from '@/lib/country-format';
import { getCountrySources, owVal } from '@/lib/country-sources';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { lang } = getLabDict();
  return { title: `${COUNTRIES_DICT[lang].hub.meta} · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}

const bestRating = (r: { sp: Rating; moodys: Rating; fitch: Rating }) =>
  [r.sp && `S&P ${r.sp.rating}`, r.moodys && `Moody's ${r.moodys.rating}`, r.fitch && `Fitch ${r.fitch.rating}`].filter(Boolean).join(' · ');

export default async function CountriesHub() {
  const { lang, L } = getLabDict();
  const D = COUNTRIES_DICT[lang];
  const namer = partnerNamer(lang, L.trade.unspecified, L.trade.otherEurope);
  const [macro, fx, trades, srcs] = await Promise.all([
    getMacro(ACTIVE.map(c => c.iso3)),
    getFx(ACTIVE.map(c => c.fx).filter(Boolean) as string[]),
    Promise.all(ACTIVE.map(async c => {
      const t = await getCountryTrade(c.gtt);
      return t.rows.length ? summarizeTrade(mergeCountry(t.rows, t.status, t.comtrade, namer))['1511'] ?? null : null;
    })),
    Promise.all(ACTIVE.map(c => getCountrySources(c.code))),
  ]);
  const others = MONITORED.filter(c => !profileOf(c.code));
  const th = 'py-2 px-3 text-right font-normal';

  return (
    <>
      <LabHeader current="/lab/countries" note={getDict().t.lab.notes.countries} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="font-cond text-3xl sm:text-4xl font-semibold tracking-tight">{D.hub.h1}</h1>
          <p className="mt-2 text-ink-2 max-w-[70ch]">{D.hub.lead}</p>
          <p className="mt-1 text-xs text-ink-3">{fill(D.hub.pilot, { n: ACTIVE.length })}</p>
        </section>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1140px]">
            <caption className="text-left font-cond text-xl font-semibold mb-2">{D.hub.compare}</caption>
            <thead>
              <tr className="text-xs text-ink-3 border-b border-rule align-bottom">
                <th scope="col" className="py-2 pr-4 text-left font-normal">{D.col.country}</th>
                <th scope="col" className={th}>{D.col.pop}</th>
                <th scope="col" className={th}>{D.col.gdp}</th>
                <th scope="col" className={th}>{D.col.gdppc}</th>
                <th scope="col" className={th}>{D.col.growth}</th>
                <th scope="col" className={th}>{D.col.cpi}</th>
                <th scope="col" className={th}>{D.col.rate}</th>
                <th scope="col" className={th}>{D.col.palm}</th>
                <th scope="col" className={th}>{D.col.palmYoy}</th>
                <th scope="col" className={th}>{D.col.my}</th>
                <th scope="col" className={th}>{D.col.mpob}</th>
                <th scope="col" className={th}>{D.col.perCap}</th>
                <th scope="col" className="py-2 pl-3 text-left font-normal">{D.col.rating}</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVE.map((c, i) => {
                const p = profileOf(c.code)!;
                const w = macro.wdi[c.iso3] ?? {};
                const s = trades[i];
                const r = c.fx ? fx[c.fx] : null;
                const src = srcs[i];
                const mp = (y: number) => src.mpob.find(x => x.product_group === 'TOTAL' && x.year === y)?.volume_t ?? null;
                const fcs = new Set(src.ow.rows.filter(x => x.forecast).map(x => x.season));
                const lastActual = [...src.ow.seasons].reverse().find(x => !fcs.has(x));
                const pc = lastActual ? owVal(src.ow, 'other', 'per_capita', lastActual) : null;
                return (
                  <tr key={c.code} className="border-b border-rule/60 hover:bg-panel">
                    <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                      <Link href={`/lab/countries/${c.code.toLowerCase()}`} className="underline underline-offset-4 decoration-rule hover:decoration-ink">
                        <span aria-hidden="true" className="mr-1.5">{p.flag}</span>{lang === 'ru' ? c.ru : c.en}
                      </Link>
                    </th>
                    <td className="py-2.5 px-3 text-right num">{people(w.pop?.value, lang, D)}</td>
                    <td className="py-2.5 px-3 text-right num">{usdBn(w.gdp?.value, lang, D)}</td>
                    <td className="py-2.5 px-3 text-right num">{usd(w.gdppc?.value, lang)}</td>
                    <td className="py-2.5 px-3 text-right num">{signed(w.growth?.value, lang)}</td>
                    <td className="py-2.5 px-3 text-right num">{pct(w.cpi?.value, lang)}</td>
                    <td className="py-2.5 px-3 text-right num">
                      {p.financial.policyRate.value == null ? '—' : `${nf(p.financial.policyRate.value, lang, 2)}%`}
                      {r ? <span className="block text-xs text-ink-3">{p.currency.code} {nf(r.rate, lang, r.rate < 10 ? 3 : 1)}</span> : null}
                    </td>
                    <td className="py-2.5 px-3 text-right num">{s ? tonnes(s.t12, lang) : '—'}</td>
                    <td className="py-2.5 px-3 text-right num">{s ? yoy(s.t12, s.t12prev, lang) : '—'}</td>
                    <td className="py-2.5 px-3 text-right num">{s ? share(s.my, s.t12, lang) : '—'}</td>
                    <td className="py-2.5 px-3 text-right num">{tonnes(mp(2026), lang)}{mp(2025) ? <span className="block text-xs text-ink-3">{yoy(mp(2026) ?? 0, mp(2025), lang)}</span> : null}</td>
                    <td className="py-2.5 px-3 text-right num">{pc == null ? '—' : nf(pc, lang, 1)}{pc != null && lastActual ? <span className="block text-xs text-ink-3">{lastActual}</span> : null}</td>
                    <td className="py-2.5 pl-3 text-left text-xs">{bestRating(p.financial.ratings) || <span className="text-ink-3">{D.fin.none}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-3 max-w-[90ch]">{D.eco.note} {D.oil.lead}</p>
        </div>

        {others.length > 0 && <section className="mt-10">
          <h2 className="font-cond text-xl font-semibold">{D.hub.others}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {others.map(c => (
              <li key={c.code} className="rounded border border-rule px-2.5 py-1 text-ink-3">
                {lang === 'ru' ? c.ru : namer(c.code, c.en)} <span className="text-xs">· {D.hub.soon}</span>
              </li>
            ))}
          </ul>
        </section>}
      </main>
    </>
  );
}
