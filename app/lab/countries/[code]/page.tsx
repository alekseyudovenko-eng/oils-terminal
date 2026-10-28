// /lab/countries/[code] — закрытая страница страны: основное, политика, экономика, финансы,
// импорт масел и жиров (GTT + Comtrade + USDA), регулирование, импортёры.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LabHeader from '@/components/LabHeader';
import { getDict } from '@/lib/i18n-server';
import { getLabDict } from '@/lib/lab-i18n';
import { fill } from '@/lib/dict';
import type { Locale } from '@/lib/i18n';
import { COUNTRIES_DICT, type CountriesDict } from '@/lib/dict-countries';
import { ACTIVE, MONITORED, PROFILES, profileOf, type Rating } from '@/lib/countries';
import { getFx, getMacro, WGI, type WgiKey } from '@/lib/country-data';
import { getCountryTrade } from '@/lib/gtt-data';
import { mergeCountry } from '@/lib/trade-merge';
import { partnerNamer } from '@/lib/trade-names';
import { summarizeTrade, type HsSummary } from '@/lib/country-trade';
import { getPsd } from '@/lib/psd';
import { OILS, METRICS, myLabel } from '@/lib/psd-meta';
import { REG, measuresFor, contentLang } from '@/lib/regulation';
import { IMPORTERS } from '@/lib/importers';
import { nf, pct, signed, usdBn, usd, people, tonnes, longDate, ymLabel, share, yoy } from '@/lib/country-format';

export const revalidate = 3600;
export function generateStaticParams() { return ACTIVE.map(c => ({ code: c.code.toLowerCase() })); }

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const { lang } = getLabDict();
  const c = MONITORED.find(m => m.code === params.code.toUpperCase());
  const name = c ? (lang === 'ru' ? c.ru : c.en) : '';
  return { title: `${name} · ${getDict().t.lab.title}`, robots: { index: false, follow: false } };
}

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="font-cond text-2xl sm:text-3xl font-semibold tracking-tight scroll-mt-20">{children}</h2>
);
const Facts = ({ items }: { items: [string, React.ReactNode, string?][] }) => (
  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
    {items.map(([k, v, hint]) => (
      <div key={k} className="border-t border-rule pt-2">
        <dt className="text-xs text-ink-3">{k}{hint ? <span className="ml-1">· {hint}</span> : null}</dt>
        <dd className="mt-0.5">{v}</dd>
      </div>
    ))}
  </dl>
);
const Tiles = ({ items }: { items: [string, string, string?][] }) => (
  <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
    {items.map(([k, v, hint]) => (
      <div key={k} className="border-t border-rule pt-2">
        <dt className="text-xs text-ink-3">{k}</dt>
        <dd className="font-cond text-2xl font-semibold num">{v}</dd>
        {hint ? <dd className="text-xs text-ink-3 num">{hint}</dd> : null}
      </div>
    ))}
  </dl>
);

function AnnualBars({ s, D, lang }: { s: HsSummary; D: CountriesDict; lang: Locale }) {
  const ys = s.years.slice(-10);
  const max = Math.max(...ys.map(y => y.t), 1);
  const W = 640, H = 200, pad = 22, bw = (W - pad) / ys.length;
  return (
    <figure className="mt-6">
      <figcaption className="font-cond text-lg font-semibold mb-2">{D.oil.annual}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 34}`} className="w-full h-auto max-w-3xl" role="img"
        aria-label={`${D.oil.annual}: ${ys.map(y => `${y.y} ${nf(y.t / 1000, lang, 0)}`).join(', ')}`}>
        {ys.map((y, i) => {
          const h = (y.t / max) * H, hm = (y.my / max) * H, x = pad + i * bw;
          return (
            <g key={y.y} opacity={y.full ? 1 : 0.45}>
              <rect x={x + 4} y={H - h + 14} width={bw - 8} height={h} fill="var(--rule)" />
              <rect x={x + 4} y={H - hm + 14} width={bw - 8} height={hm} fill="var(--gold)" />
              <text x={x + bw / 2} y={H - h + 9} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{nf(y.t / 1000, lang, y.t < 10000 ? 1 : 0)}</text>
              <text x={x + bw / 2} y={H + 30} textAnchor="middle" fontSize="12" fill="var(--ink-3)">{y.y}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-ink-3">{D.oil.annualNote}</p>
    </figure>
  );
}

function TradeTable({ list, D, lang, hsName }: { list: HsSummary[]; D: CountriesDict; lang: Locale; hsName: (hs: string) => string }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm min-w-[620px]">
        <thead>
          <tr className="text-xs text-ink-3 border-b border-rule">
            <th scope="col" className="py-2 pr-4 text-left font-normal">{D.oil.product}</th>
            <th scope="col" className="py-2 px-3 text-right font-normal">{D.oil.t12}</th>
            <th scope="col" className="py-2 px-3 text-right font-normal">{D.oil.yoy}</th>
            <th scope="col" className="py-2 px-3 text-right font-normal">{D.oil.my}</th>
            <th scope="col" className="py-2 px-3 text-right font-normal">{D.oil.id}</th>
            <th scope="col" className="py-2 pl-3 text-right font-normal">{D.oil.price}</th>
          </tr>
        </thead>
        <tbody>
          {list.map(s => (
            <tr key={s.hs} className="border-b border-rule/60">
              <th scope="row" className="py-2 pr-4 text-left font-normal">{hsName(s.hs)} <span className="text-ink-3 text-xs">{s.hs}</span></th>
              <td className="py-2 px-3 text-right num">{tonnes(s.t12, lang)}</td>
              <td className="py-2 px-3 text-right num">{yoy(s.t12, s.t12prev, lang)}</td>
              <td className="py-2 px-3 text-right num">{share(s.my, s.t12, lang)}</td>
              <td className="py-2 px-3 text-right num">{share(s.id, s.t12, lang)}</td>
              <td className="py-2 pl-3 text-right num">{s.usdPerT ? usd(s.usdPerT, lang) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list[0] && <p className="mt-1 text-xs text-ink-3">{fill(D.oil.window, { from: ymLabel(list[0].from, lang), to: ymLabel(list[0].to, lang) })}{list.some(s => s.mixed) ? ` ${D.oil.mixed}` : ''}</p>}
    </div>
  );
}

export default async function CountryPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const meta = MONITORED.find(m => m.code === code);
  const p = profileOf(code);
  if (!meta || !p) return notFound();

  const { lang, L } = getLabDict();
  const D = COUNTRIES_DICT[lang];
  const cl = contentLang(lang);
  const name = lang === 'ru' ? meta.ru : meta.en;
  const namer = partnerNamer(lang, L.trade.unspecified, L.trade.otherEurope);
  const hsName = (hs: string) => L.trade.hs[hs as keyof typeof L.trade.hs] ?? hs;

  const [macro, fx, trade, psd] = await Promise.all([
    getMacro([meta.iso3]),
    meta.fx ? getFx([meta.fx]) : Promise.resolve({}),
    getCountryTrade(meta.gtt),
    getPsd(),
  ]);
  const w = macro.wdi[meta.iso3] ?? {};
  const g = macro.wgi[meta.iso3] ?? {};
  const rate = meta.fx ? (fx as Record<string, { rate: number; chg1m: number | null; chgYtd: number | null } | null>)[meta.fx] ?? null : null;
  const sum = trade.rows.length ? summarizeTrade(mergeCountry(trade.rows, trade.status, trade.comtrade, namer)) : {};
  const oils = ['1511', '1513', '1512'].map(h => sum[h]).filter(Boolean) as HsSummary[];
  const fats = ['1516', '1517'].map(h => sum[h]).filter(Boolean) as HsSummary[];
  const palm = sum['1511'];

  // Баланс USDA: последний маркетинговый год не позже текущего.
  const psdRows = psd.rows.filter(r => r.country_name === meta.en);
  const year = new Date().getUTCFullYear();
  const psdYear = Math.max(...psdRows.filter(r => r.market_year <= year).map(r => r.market_year), 0);
  const psdOils = OILS.filter(o => psdRows.some(r => r.commodity === o.id && r.market_year === psdYear));
  const psdVal = (oil: string, m: string) => psdRows.find(r => r.commodity === oil && r.attribute === m && r.market_year === psdYear)?.value;

  const regC = REG.countries.find(c => c.code === code);
  const measures = regC ? measuresFor(regC).sort((a, z) => z.date.localeCompare(a.date)) : [];
  const companies = IMPORTERS.countries.find(c => c.id === code.toLowerCase())?.companies.length ?? 0;

  const obsHint = (o: { year: string } | null | undefined) => (o ? o.year : undefined);
  const fin = p.financial;
  const ratingRow = (agency: string, r: Rating) => (
    <tr key={agency} className="border-b border-rule/60">
      <th scope="row" className="py-2 pr-4 text-left font-normal">{agency}</th>
      <td className="py-2 px-3 font-medium">{r ? r.rating : <span className="text-ink-3">{D.fin.none}</span>}</td>
      <td className="py-2 px-3">{r ? D.fin.outlooks[r.outlook] ?? r.outlook : ''}</td>
      <td className="py-2 pl-3 text-ink-3 num">{r ? longDate(r.date, lang) : ''}</td>
    </tr>
  );
  const dynYears = Array.from({ length: 7 }, (_, i) => String(year - 4 + i));
  const imfG = macro.imfGrowth[meta.iso3] ?? {}, imfC = macro.imfCpi[meta.iso3] ?? {};
  const wgiYear = Object.values(g).find(Boolean)?.year;

  const toc: [string, string][] = [
    ['basic', D.sec.basic], ['political', D.sec.political], ['economic', D.sec.economic], ['financial', D.sec.financial],
    ['oils', D.sec.oils], ['fats', D.sec.fats], ['regulation', D.sec.regulation], ['companies', D.sec.companies], ['sources', D.sec.sources],
  ];

  return (
    <>
      <LabHeader current="/lab/countries" note={getDict().t.lab.notes.countries} translated />
      <main className="mx-auto max-w-page w-full px-4 sm:px-6 pb-16">
        <section className="pt-6 pb-4">
          <Link href="/lab/countries" className="text-sm text-ink-3 hover:text-ink">← {D.back}</Link>
          <h1 className="mt-2 font-cond text-3xl sm:text-4xl font-semibold tracking-tight">
            <span aria-hidden="true" className="mr-2">{p.flag}</span>{name}
          </h1>
          <nav aria-label={name} className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {toc.map(([id, t]) => <a key={id} href={`#${id}`} className="text-ink-2 hover:text-ink underline-offset-4 hover:underline">{t}</a>)}
          </nav>
        </section>

        <section aria-labelledby="basic" className="pt-6">
          <H2 id="basic">{D.sec.basic}</H2>
          <Tiles items={[
            [D.basic.population, people(w.pop?.value, lang, D), obsHint(w.pop)],
            [D.eco.gdp, usdBn(w.gdp?.value, lang, D), obsHint(w.gdp)],
            [D.eco.gdppc, usd(w.gdppc?.value, lang), obsHint(w.gdppc)],
            [D.basic.area, w.area ? `${nf(w.area.value / 1000, lang, 0)} ${D.units.km2}` : '—', obsHint(w.area)],
          ]} />
          <Facts items={[
            [D.basic.capital, p.capital[cl]],
            [D.basic.languages, p.languages[cl]],
            [D.basic.currency, `${p.currency[cl]} (${p.currency.code})`],
            [D.basic.urban, pct(w.urban?.value, lang, 0), obsHint(w.urban)],
            [D.basic.memberships, p.memberships.map(m => D.mem[m] ?? m).join(' · ')],
          ]} />
        </section>

        <section aria-labelledby="political" className="pt-10">
          <H2 id="political">{D.sec.political}</H2>
          <Facts items={[
            [D.pol.system, p.political.system[cl]],
            [D.pol.headOfState, p.political.headOfState[cl]],
            [D.pol.headOfGov, p.political.headOfGov[cl]],
            [D.pol.elections, p.political.elections[cl]],
            [D.pol.notes, p.political.notes[cl]],
          ]} />
          <h3 className="mt-6 font-cond text-lg font-semibold">{D.pol.wgi}</h3>
          <ul className="mt-2 max-w-xl space-y-2">
            {(Object.keys(WGI) as WgiKey[]).map(k => {
              const v = g[k]?.value;
              const pos = v == null ? null : Math.min(Math.max((v + 2.5) / 5, 0), 1) * 100;
              return (
                <li key={k} className="grid grid-cols-[minmax(0,14rem)_1fr_3.5rem] items-center gap-3 text-sm">
                  <span>{D.pol.wgiNames[k]}</span>
                  <span className="relative h-2 rounded bg-rule" aria-hidden="true">
                    <span className="absolute top-[-3px] h-3.5 w-[2px] bg-ink-3" style={{ left: '50%' }} />
                    {pos != null && <span className="absolute top-[-4px] h-4 w-4 -ml-2 rounded-full bg-gold border-2 border-paper" style={{ left: `${pos}%` }} />}
                  </span>
                  <span className="text-right num">{v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf(Math.abs(v), lang, 2)}`}</span>
                </li>
              );
            })}
          </ul>
          {wgiYear && <p className="mt-2 text-xs text-ink-3">{fill(D.pol.wgiNote, { y: wgiYear })}</p>}
        </section>

        <section aria-labelledby="economic" className="pt-10">
          <H2 id="economic">{D.sec.economic}</H2>
          <Tiles items={[
            [D.eco.growth, signed(w.growth?.value, lang), obsHint(w.growth)],
            [D.eco.cpi, pct(w.cpi?.value, lang), obsHint(w.cpi)],
            [D.eco.trade, pct(w.trade?.value, lang, 0), obsHint(w.trade)],
            [D.eco.cab, signed(w.cab?.value, lang), obsHint(w.cab)],
            [D.eco.reserves, usdBn(w.reserves?.value, lang, D), obsHint(w.reserves)],
            [D.eco.remit, pct(w.remit?.value, lang), obsHint(w.remit)],
          ]} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px] max-w-3xl">
              <caption className="text-left font-cond text-lg font-semibold mb-2">{D.eco.dyn}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{D.eco.year}</th>
                  {dynYears.map(y => (
                    <th key={y} scope="col" className="py-2 px-2 text-right font-normal">{y}{Number(y) >= year ? <span className="block">{D.eco.forecast}</span> : null}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([[D.eco.growth, imfG], [D.eco.cpi, imfC]] as const).map(([label, ser]) => (
                  <tr key={label} className="border-b border-rule/60">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{label}</th>
                    {dynYears.map(y => (
                      <td key={y} className={`py-2 px-2 text-right num ${Number(y) >= year ? 'text-ink-2 italic' : ''}`}>{ser[y] == null ? '—' : pct(ser[y], lang)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-ink-3">{D.eco.note}</p>
          </div>
        </section>

        <section aria-labelledby="financial" className="pt-10">
          <H2 id="financial">{D.sec.financial}</H2>
          <Tiles items={[
            [D.fin.rate, `${nf(fin.policyRate.value, lang, 2)}%`, fill(D.fin.decided, { d: longDate(fin.policyRate.decided, lang) })],
            [`${D.fin.fx} (${p.currency.code})`, rate ? nf(rate.rate, lang, rate.rate < 10 ? 4 : 2) : '—',
              rate ? `${D.fin.fx1m} ${signed(rate.chg1m, lang)} · ${D.fin.fxYtd} ${signed(rate.chgYtd, lang)}` : undefined],
          ]} />
          <Facts items={[
            [D.fin.centralBank, p.financial.centralBank[cl]],
            [D.fin.rate, fin.policyRate[cl]],
            [D.fin.fxRegime, fin.fxRegime[cl]],
          ]} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px] max-w-2xl">
              <caption className="text-left font-cond text-lg font-semibold mb-2">{D.fin.ratings}</caption>
              <thead>
                <tr className="text-xs text-ink-3 border-b border-rule">
                  <th scope="col" className="py-2 pr-4 text-left font-normal">{D.fin.agency}</th>
                  <th scope="col" className="py-2 px-3 text-left font-normal">{D.fin.rating}</th>
                  <th scope="col" className="py-2 px-3 text-left font-normal">{D.fin.outlook}</th>
                  <th scope="col" className="py-2 pl-3 text-left font-normal">{D.fin.date}</th>
                </tr>
              </thead>
              <tbody>
                {ratingRow("S&P", fin.ratings.sp)}
                {ratingRow("Moody's", fin.ratings.moodys)}
                {ratingRow('Fitch', fin.ratings.fitch)}
              </tbody>
            </table>
            {fin.ratings.note && <p className="mt-2 text-sm text-ink-2 max-w-[80ch]">{fin.ratings.note[cl]}</p>}
            <p className="mt-1 text-xs text-ink-3">{D.fin.fxNote}</p>
          </div>
        </section>

        <section aria-labelledby="oils" className="pt-10">
          <H2 id="oils">{D.sec.oils}</H2>
          <p className="mt-2 text-sm text-ink-2 max-w-[80ch]">{D.oil.lead}</p>
          {oils.length ? (
            <>
              <TradeTable list={oils} D={D} lang={lang} hsName={hsName} />
              {palm && <AnnualBars s={palm} D={D} lang={lang} />}
              {palm && palm.top.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px] max-w-xl">
                    <caption className="text-left font-cond text-lg font-semibold mb-2">{D.oil.top}</caption>
                    <thead>
                      <tr className="text-xs text-ink-3 border-b border-rule">
                        <th scope="col" className="py-2 pr-4 text-left font-normal">{D.oil.supplier}</th>
                        <th scope="col" className="py-2 px-3 text-right font-normal">{D.units.t}</th>
                        <th scope="col" className="py-2 pl-3 text-right font-normal">{D.oil.share}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {palm.top.map(t => (
                        <tr key={t.code} className="border-b border-rule/60">
                          <th scope="row" className="py-2 pr-4 text-left font-normal">{t.name}</th>
                          <td className="py-2 px-3 text-right num">{tonnes(t.t, lang)}</td>
                          <td className="py-2 pl-3 text-right num">{share(t.t, palm.t12, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : <p className="mt-3 text-ink-3">{D.oil.none}</p>}
          <p className="mt-3 text-sm"><Link href="/lab/trade" className="underline underline-offset-4 hover:text-ink text-ink-2">{D.oil.more}</Link></p>

          <h3 className="mt-8 font-cond text-lg font-semibold">{D.oil.usda}{psdYear ? ` · ${fill(D.oil.my_, { y: myLabel(psdYear) })}` : ''}</h3>
          {psdOils.length ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px] max-w-3xl">
                <thead>
                  <tr className="text-xs text-ink-3 border-b border-rule">
                    <th scope="col" className="py-2 pr-4 text-left font-normal">{D.oil.product}</th>
                    {METRICS.map(m => <th key={m.id} scope="col" className="py-2 px-3 text-right font-normal">{D.oil.usdaCols[m.id]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {psdOils.map(o => (
                    <tr key={o.id} className="border-b border-rule/60">
                      <th scope="row" className="py-2 pr-4 text-left font-normal">{D.oil.oilNames[o.id]}</th>
                      {METRICS.map(m => { const v = psdVal(o.id, m.id); return <td key={m.id} className="py-2 px-3 text-right num">{v == null ? '—' : nf(v, lang, 0)}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!psdOils.some(o => o.id === 'palm') && <p className="mt-2 text-xs text-ink-3">{D.oil.usdaNone}</p>}
        </section>

        <section aria-labelledby="fats" className="pt-10">
          <H2 id="fats">{D.sec.fats}</H2>
          <p className="mt-2 text-sm text-ink-2 max-w-[80ch]">{D.fats.lead}</p>
          {fats.length ? <TradeTable list={fats} D={D} lang={lang} hsName={hsName} /> : <p className="mt-3 text-ink-3">{D.oil.none}</p>}
        </section>

        <section aria-labelledby="regulation" className="pt-10">
          <H2 id="regulation">{D.sec.regulation}</H2>
          {regC ? (
            <>
              <p className="mt-2 max-w-[80ch]">{regC.summary[cl]}</p>
              <p className="mt-2 text-sm text-ink-2 max-w-[80ch]"><span className="text-ink-3">{D.reg.claim}:</span> «{regC.claimPhrase}». {regC.practice[cl]}</p>
              <ul className="mt-4 space-y-3 max-w-[90ch]">
                {measures.map(m => (
                  <li key={m.id} className="border-t border-rule pt-2">
                    <p className="text-xs text-ink-3"><span className="uppercase tracking-wide">{D.reg.status[m.status]}</span> · {m.date} · {m.act[cl]}</p>
                    <p className="mt-0.5">{m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-rule hover:decoration-ink">{m.title[cl]}</a> : m.title[cl]}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="mt-3 text-ink-3">{D.reg.none}</p>}
          <p className="mt-3 text-sm"><Link href="/lab/regulation" className="underline underline-offset-4 hover:text-ink text-ink-2">{D.reg.more}</Link></p>
        </section>

        <section aria-labelledby="companies" className="pt-10">
          <H2 id="companies">{D.sec.companies}</H2>
          <p className="mt-2">{companies ? fill(D.comp.n, { n: String(companies) }) : D.comp.none}</p>
          <p className="mt-1 text-sm"><Link href="/lab/importers" className="underline underline-offset-4 hover:text-ink text-ink-2">{D.comp.more}</Link></p>
        </section>

        <section aria-labelledby="sources" className="pt-10">
          <H2 id="sources">{D.sec.sources}</H2>
          <p className="mt-2 text-sm text-ink-2">{fill(D.src.curated, { d: longDate(PROFILES.updatedAt, lang) })} {D.src.auto}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {[...p.political.sources, ...p.financial.sources].map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-rule hover:decoration-ink">{s.title}</a>
                <span className="text-ink-3"> · {fill(D.src.checked, { d: longDate(s.date, lang) })}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
