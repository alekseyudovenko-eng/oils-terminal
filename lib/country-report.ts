// lib/country-report.ts — PDF-отчёт по стране на бланке IMA (только «Лаборатория», по кнопке на странице страны).
// Собирает те же данные, что страница /lab/countries/[code]: основное, баланс (Oil World, USDA), импорт (GTT/Comtrade),
// экспорт Малайзии (MPOB), игроки, регулирование, заметки IMA/MPOC. PDF создаётся на лету и нигде не сохраняется:
// ни в репозиторий, ни в хранилище. Содержит лицензионные данные — только для внутреннего использования.
import type { Locale } from './i18n';
import { COUNTRIES_DICT } from './dict-countries';
import { LAB_DICT } from './dict-lab';
import { fill } from './dict';
import { MONITORED, PROFILES, profileOf } from './countries';
import { getFx, getMacro, WGI, type WgiKey } from './country-data';
import { getCountryTrade } from './gtt-data';
import { mergeCountry } from './trade-merge';
import { partnerNamer } from './trade-names';
import { summarizeTrade, type HsSummary } from './country-trade';
import { getPsd } from './psd';
import { OILS, METRICS, myLabel } from './psd-meta';
import { REG, measuresFor, contentLang } from './regulation';
import { IMPORTERS } from './importers';
import { nf, pct, signed, usdBn, usd, people, tonnes, longDate, ymLabel, share, yoy } from './country-format';
import { getCountrySources, owVal } from './country-sources';
import { Pdf } from './pdf-doc';

const T = {
  ru: {
    title: 'Отчёт по стране', org: 'International Marketing Agency · IMA', page: 'Стр.',
    footer: 'IMA · для внутреннего использования. Содержит данные GTT, Oil World и MPOB: не публиковать на сайте и в соцсетях, не пересылать за пределы IMA и MPOC.',
    prepared: 'Подготовлено', summary: 'Коротко',
    sumLine: 'Импорт пальмового масла за 12 мес. ({w}): {t} т ({yoy} к предыдущим 12 мес.); доля Малайзии {my}, Индонезии {id}.',
    sumNoTrade: 'Данных по импорту пальмового масла в базе пока нет.',
    market: 'Рынок по данным IMA', players: 'Игроки рынка', playersLead: 'Компании в базе IMA (из {n}); подробные карточки и контакты — в разделе «Импортёры» Лаборатории.',
    company: 'Компания', segment: 'Сегмент', scale: 'Масштаб', volume: 'Объём', noPlayers: 'Компаний по этой стране в базе пока нет.',
    reg: 'Регулирование', regDate: 'Дата', regStatus: 'Статус', regMeasure: 'Норма',
    sources: 'Источники', link: 'ссылка', na: 'нет данных',
  },
  en: {
    title: 'Country report', org: 'International Marketing Agency · IMA', page: 'Page',
    footer: 'IMA · internal use only. Contains GTT, Oil World and MPOB data: do not publish on the website or social media, do not share outside IMA and MPOC.',
    prepared: 'Prepared', summary: 'Key points',
    sumLine: 'Palm oil imports, last 12 months ({w}): {t} t ({yoy} vs the previous 12 months); Malaysia share {my}, Indonesia {id}.',
    sumNoTrade: 'No palm oil import data in the database yet.',
    market: 'Market overview (IMA)', players: 'Market players', playersLead: 'Companies in the IMA database (of {n}); full profiles and contacts are in the Lab "Importers" section.',
    company: 'Company', segment: 'Segment', scale: 'Scale', volume: 'Volume', noPlayers: 'No companies for this country in the database yet.',
    reg: 'Regulation', regDate: 'Date', regStatus: 'Status', regMeasure: 'Measure',
    sources: 'Sources', link: 'link', na: 'no data',
  },
};
const tr = (lang: Locale) => (lang === 'ru' ? T.ru : T.en);

export function reportFileName(code: string, date = new Date()) {
  return `IMA-country-report-${code.toLowerCase()}-${date.toISOString().slice(0, 10)}.pdf`;
}

/** Собирает PDF; null — если страна неизвестна или без сводки. */
export async function buildCountryReport(rawCode: string, lang: Locale): Promise<Uint8Array | null> {
  const code = rawCode.toUpperCase();
  const meta = MONITORED.find(m => m.code === code);
  const p = profileOf(code);
  if (!meta || !p) return null;

  const D = COUNTRIES_DICT[lang];
  const L = LAB_DICT[lang];
  const S = tr(lang);
  const cl = contentLang(lang);
  const name = lang === 'ru' ? meta.ru : meta.en;
  const namer = partnerNamer(lang, L.trade.unspecified, L.trade.otherEurope);
  const hsName = (hs: string) => L.trade.hs[hs as keyof typeof L.trade.hs] ?? hs;

  const [macro, fx, trade, psd, src] = await Promise.all([
    getMacro([meta.iso3]),
    meta.fx ? getFx([meta.fx]) : Promise.resolve({}),
    getCountryTrade(meta.gtt),
    getPsd(),
    getCountrySources(code),
  ]);
  const w = macro.wdi[meta.iso3] ?? {};
  const g = macro.wgi[meta.iso3] ?? {};
  const rate = meta.fx ? (fx as Record<string, { rate: number; chg1m: number | null; chgYtd: number | null } | null>)[meta.fx] ?? null : null;
  const sum = trade.rows.length ? summarizeTrade(mergeCountry(trade.rows, trade.status, trade.comtrade, namer)) : {};
  const oils = ['1511', '1513', '1512'].map(h => sum[h]).filter(Boolean) as HsSummary[];
  const fats = ['1516', '1517'].map(h => sum[h]).filter(Boolean) as HsSummary[];
  const palm = sum['1511'];
  const year = new Date().getUTCFullYear();

  const pdf = await Pdf.create({
    title: S.title, subtitle: name, org: S.org, pageWord: S.page, footer: S.footer,
    dateLine: `${S.prepared}: ${longDate(new Date().toISOString().slice(0, 10), lang)}`,
  });

  // ---------- Коротко ----------
  pdf.h1(S.summary);
  pdf.callout(palm
    ? fill(S.sumLine, {
      w: `${ymLabel(palm.from, lang)} – ${ymLabel(palm.to, lang)}`, t: tonnes(palm.t12, lang), yoy: yoy(palm.t12, palm.t12prev, lang),
      my: share(palm.my, palm.t12, lang), id: share(palm.id, palm.t12, lang),
    })
    : S.sumNoTrade);
  pdf.tiles([
    [D.basic.population, people(w.pop?.value, lang, D), w.pop?.year],
    [D.eco.gdp, usdBn(w.gdp?.value, lang, D), w.gdp?.year],
    [D.eco.growth, signed(w.growth?.value, lang), w.growth?.year],
    [D.eco.cpi, pct(w.cpi?.value, lang), w.cpi?.year],
  ]);
  const ic = IMPORTERS.countries.find(c => c.id === code.toLowerCase());
  if (ic?.summary) pdf.text(ic.summary, { size: 9, color: undefined, gap: 6 });

  // ---------- Баланс: Oil World + USDA ----------
  pdf.h1(D.sec.balance);
  const ow = src.ow;
  if (ow.rows.length) {
    const eu = ow.rows.some(r => r.scope === 'extra_eu');
    const fc = new Set(ow.rows.filter(r => r.forecast).map(r => r.season));
    const actual = [...ow.seasons].reverse().find(s => !fc.has(s)) ?? ow.seasons[ow.seasons.length - 1];
    const hasCons = ow.rows.some(r => r.section === 'consumption');
    const sortSec = hasCons ? 'consumption' : 'production';
    const items = Array.from(new Set(ow.rows.filter(r => r.item !== 'Total' && ['production', 'imports', 'exports', 'consumption'].includes(r.section)).map(r => r.item)))
      .map(it => ({ it, v: Math.max(owVal(ow, sortSec, it, actual) ?? 0, owVal(ow, 'imports', it, actual) ?? 0) }))
      .filter(x => x.v >= 0.5).sort((a, z) => z.v - a.v).map(x => x.it);
    const cols: [string, string][] = [['production', D.ow.production], ['imports', eu ? D.ow.importsEu : D.ow.imports], ['exports', eu ? D.ow.exportsEu : D.ow.exports]];
    if (hasCons) cols.push(['consumption', D.ow.consumption]);
    const cell = (sec: string, it: string, se: string) => { const v = owVal(ow, sec, it, se); return v == null ? '—' : nf(v, lang, 0); };
    const lbl = (s: string) => `${s}${fc.has(s) ? ` ${D.ow.f}` : ''}`;
    pdf.text(D.ow.lead + (eu ? ` ${D.ow.leadEu}` : ''), { size: 8.5, color: undefined, gap: 6 });
    const rows = [...items, 'Total'].map(it => [D.ow.items[it] ?? it, ...cols.map(([k]) => cell(k, it, actual))]);
    pdf.table(
      [{ title: `${D.ow.product} · ${lbl(actual)}`, w: 2.4 }, ...cols.map(([, t]) => ({ title: t, w: 1.3, align: 'r' as const }))],
      rows, { boldRows: [rows.length - 1], hiRows: [items.indexOf('Palm oil')].filter(i => i >= 0) },
    );
    const palmShare = (se: string) => { const pv = owVal(ow, 'consumption', 'Palm oil', se), tv = owVal(ow, 'consumption', 'Total', se); return pv != null && tv ? pct((100 * pv) / tv, lang, 1) : '—'; };
    const trows: string[][] = cols.map(([k, t]) => [t, ...ow.seasons.map(se => cell(k, 'Total', se))]);
    if (hasCons) {
      trows.push([D.ow.palmShare, ...ow.seasons.map(palmShare)]);
      trows.push([D.ow.perCapita, ...ow.seasons.map(se => { const v = owVal(ow, 'other', 'per_capita', se); return v == null ? '—' : nf(v, lang, 1); })]);
    }
    pdf.table(
      [{ title: D.ow.totals, w: 2.6 }, ...ow.seasons.map(se => ({ title: lbl(se), w: 1, align: 'r' as const }))],
      trows,
    );
    pdf.note(`${D.ow.note} ${ow.edition ? fill(D.ow.edition, { e: ow.edition }) : ''}`);
  } else {
    pdf.text(D.ow.none, { size: 9, color: undefined });
  }

  // USDA
  const psdRows = psd.rows.filter(r => r.country_name === meta.en);
  const psdYear = Math.max(...psdRows.filter(r => r.market_year <= year).map(r => r.market_year), 0);
  const psdOils = OILS.filter(o => psdRows.some(r => r.commodity === o.id && r.market_year === psdYear));
  const psdVal = (oil: string, m: string) => psdRows.find(r => r.commodity === oil && r.attribute === m && r.market_year === psdYear)?.value;
  if (psdOils.length) {
    pdf.h2(`${D.oil.usda}${psdYear ? ` · ${fill(D.oil.my_, { y: myLabel(psdYear) })}` : ''}`);
    pdf.table(
      [{ title: D.oil.product, w: 1.6 }, ...METRICS.map(m => ({ title: D.oil.usdaCols[m.id], w: 1.1, align: 'r' as const }))],
      psdOils.map(o => [D.oil.oilNames[o.id], ...METRICS.map(m => { const v = psdVal(o.id, m.id); return v == null ? '—' : nf(v, lang, 0); })]),
    );
  }
  if (!psdOils.some(o => o.id === 'palm')) pdf.note(D.oil.usdaNone);

  // ---------- Импорт ----------
  pdf.h1(D.sec.oils);
  pdf.text(D.oil.lead, { size: 8.5, gap: 6 });
  const tradeTable = (list: HsSummary[]) => {
    pdf.table(
      [{ title: D.oil.product, w: 2.2 }, { title: D.oil.t12, w: 1.1, align: 'r' }, { title: D.oil.yoy, w: 0.8, align: 'r' },
        { title: D.oil.my, w: 1, align: 'r' }, { title: D.oil.id, w: 1, align: 'r' }, { title: D.oil.price, w: 0.9, align: 'r' }],
      list.map(s => [`${hsName(s.hs)} (${s.hs})`, tonnes(s.t12, lang), yoy(s.t12, s.t12prev, lang), share(s.my, s.t12, lang), share(s.id, s.t12, lang), s.usdPerT ? usd(s.usdPerT, lang) : '—']),
    );
    if (list[0]) pdf.note(`${fill(D.oil.window, { from: ymLabel(list[0].from, lang), to: ymLabel(list[0].to, lang) })}${list.some(s => s.mixed) ? ` ${D.oil.mixed}` : ''}`);
  };
  if (oils.length) {
    tradeTable(oils);
    if (palm) {
      const ys = palm.years.slice(-10);
      pdf.bars(ys.map(y => ({ label: y.y, total: y.t, my: y.my, faded: !y.full })), D.oil.annual, D.oil.annualNote);
      if (palm.top.length) {
        pdf.h2(D.oil.top);
        pdf.table(
          [{ title: D.oil.supplier, w: 3 }, { title: D.units.t, w: 1.2, align: 'r' }, { title: D.oil.share, w: 1, align: 'r' }],
          palm.top.slice(0, 8).map(t => [t.name, tonnes(t.t, lang), share(t.t, palm.t12, lang)]),
        );
      }
    }
  } else {
    pdf.text(D.oil.none, { size: 9 });
  }

  // ---------- Маргарины и спецжиры ----------
  if (fats.length) {
    pdf.h2(D.sec.fats);
    tradeTable(fats);
    const rows = new Map<string, { name: string; t: number }>();
    for (const s of fats) for (const t of s.top) {
      const r = rows.get(t.code) ?? { name: t.name, t: 0 };
      r.t += t.t; rows.set(t.code, r);
    }
    const grand = fats.reduce((a, s) => a + s.t12, 0);
    const top = Array.from(rows.values()).sort((a, z) => z.t - a.t).slice(0, 8);
    if (top.length) {
      pdf.table(
        [{ title: D.fats.suppliers, w: 3 }, { title: `${D.fats.total}, ${D.units.t}`, w: 1.2, align: 'r' }, { title: D.oil.share, w: 1, align: 'r' }],
        top.map(t => [t.name, tonnes(t.t, lang), share(t.t, grand, lang)]),
      );
    }
  }

  // ---------- MPOB ----------
  const mp = src.mpob;
  const tot = (y: number) => mp.find(r => r.product_group === 'TOTAL' && r.year === y)?.volume_t ?? null;
  const t26 = tot(2026), t25 = tot(2025);
  if (t26 != null || t25 != null) {
    pdf.h1(D.mpob.title);
    const period = mp[0]?.period ?? '';
    pdf.tiles([
      [`${D.mpob.total}, ${period} 2026`, tonnes(t26, lang)],
      [`${D.mpob.total}, ${period} 2025`, tonnes(t25, lang)],
      [D.mpob.change, t26 != null && t25 ? yoy(t26, t25, lang) : '—'],
    ]);
    const detail = mp.filter(r => r.product_group !== 'TOTAL');
    const groups = Array.from(new Set(detail.map(r => r.product_group)));
    const gv = (grp: string, y: number) => detail.filter(r => r.product_group === grp && r.year === y).reduce((a, r) => a + (r.volume_t ?? 0), 0);
    if (groups.length) {
      pdf.table(
        [{ title: D.mpob.group, w: 3 }, { title: '2026', w: 1, align: 'r' }, { title: '2025', w: 1, align: 'r' }, { title: D.mpob.change, w: 1, align: 'r' }],
        groups.map(grp => [D.mpob.groups[grp] ?? grp, tonnes(gv(grp, 2026), lang), tonnes(gv(grp, 2025), lang), yoy(gv(grp, 2026), gv(grp, 2025), lang)]),
      );
    }
    pdf.note(D.mpob.note);
  }

  // ---------- Игроки ----------
  pdf.h1(S.players);
  if (ic?.market?.length) {
    pdf.h2(S.market);
    pdf.table([{ title: '', w: 1.4 }, { title: '', w: 2 }], ic.market.map(m => [m.label, m.value]));
  }
  if (ic?.companies.length) {
    const order = ['крупнейший', 'крупный', 'средний', 'малый'];
    const list = [...ic.companies].sort((a, z) => {
      const ia = order.indexOf(a.scale ?? ''), iz = order.indexOf(z.scale ?? '');
      return (ia < 0 ? 9 : ia) - (iz < 0 ? 9 : iz);
    }).slice(0, 15);
    pdf.text(fill(S.playersLead, { n: String(ic.companies.length) }), { size: 8.5, gap: 6 });
    pdf.table(
      [{ title: S.company, w: 2.2 }, { title: S.segment, w: 1.8 }, { title: S.scale, w: 1 }, { title: S.volume, w: 2 }],
      list.map(c => [c.group ? `${c.name} (${c.group})` : c.name, c.segment.join(', '), c.scale ?? '—', c.volume ?? '—']),
    );
  } else {
    pdf.text(S.noPlayers, { size: 9 });
  }

  // ---------- Регулирование ----------
  pdf.h1(S.reg);
  const regC = REG.countries.find(c => c.code === code);
  if (regC) {
    pdf.text(regC.summary[cl], { size: 9, gap: 4 });
    pdf.text(`${D.reg.claim}: «${regC.claimPhrase}». ${regC.practice[cl]}`, { size: 8.5, gap: 6 });
    const measures = measuresFor(regC).sort((a, z) => z.date.localeCompare(a.date)).slice(0, 12);
    pdf.table(
      [{ title: S.regDate, w: 0.9 }, { title: S.regStatus, w: 1 }, { title: S.regMeasure, w: 4 }],
      measures.map(m => [m.date, D.reg.status[m.status], `${m.title[cl]} (${m.act[cl]})`]),
    );
  } else {
    pdf.text(D.reg.none, { size: 9 });
  }

  // ---------- Политика, экономика, финансы ----------
  pdf.h1(`${D.sec.political} · ${D.sec.economic} · ${D.sec.financial}`);
  pdf.facts([
    [D.basic.capital, p.capital[cl]],
    [D.basic.currency, `${p.currency[cl]} (${p.currency.code})`],
    [D.pol.system, p.political.system[cl]],
    [D.pol.headOfState, p.political.headOfState[cl]],
    [D.pol.headOfGov, p.political.headOfGov[cl]],
    [D.pol.elections, p.political.elections[cl]],
    [D.pol.notes, p.political.notes[cl]],
    [D.basic.memberships, p.memberships.map(m => D.mem[m] ?? m).join(' · ')],
  ]);
  pdf.tiles([
    [D.eco.gdppc, usd(w.gdppc?.value, lang), w.gdppc?.year],
    [D.eco.trade, pct(w.trade?.value, lang, 0), w.trade?.year],
    [D.eco.cab, signed(w.cab?.value, lang), w.cab?.year],
    [D.eco.reserves, usdBn(w.reserves?.value, lang, D), w.reserves?.year],
  ]);
  const dynYears = Array.from({ length: 7 }, (_, i) => String(year - 4 + i));
  const imfG = macro.imfGrowth[meta.iso3] ?? {}, imfC = macro.imfCpi[meta.iso3] ?? {};
  pdf.table(
    [{ title: D.eco.dyn, w: 2.4 }, ...dynYears.map(y => ({ title: Number(y) >= year ? `${y} ${D.eco.forecast}` : y, w: 1, align: 'r' as const }))],
    [[D.eco.growth, ...dynYears.map(y => (imfG[y] == null ? '—' : pct(imfG[y], lang)))], [D.eco.cpi, ...dynYears.map(y => (imfC[y] == null ? '—' : pct(imfC[y], lang)))]],
  );
  pdf.note(D.eco.note);
  const fin = p.financial;
  pdf.facts([
    [D.fin.centralBank, fin.centralBank[cl]],
    [D.fin.rate, `${fin.policyRate.value == null ? '—' : `${nf(fin.policyRate.value, lang, 2)}%`}${fin.policyRate.decided ? ` (${fill(D.fin.decided, { d: longDate(fin.policyRate.decided, lang) })})` : ''}`],
    [`${D.fin.fx} (${p.currency.code})`, rate ? `${nf(rate.rate, lang, rate.rate < 10 ? 4 : 2)} · ${D.fin.fx1m} ${signed(rate.chg1m, lang)} · ${D.fin.fxYtd} ${signed(rate.chgYtd, lang)}` : '—'],
    [D.fin.fxRegime, fin.fxRegime[cl]],
  ]);
  const rr = (a: string, r: { rating: string; outlook: string; date: string } | null) =>
    [a, r ? r.rating : D.fin.none, r ? (D.fin.outlooks[r.outlook] ?? r.outlook) : '', r ? longDate(r.date, lang) : ''];
  pdf.table(
    [{ title: D.fin.ratings, w: 1.6 }, { title: D.fin.rating, w: 1 }, { title: D.fin.outlook, w: 1.4 }, { title: D.fin.date, w: 1.6 }],
    [rr('S&P', fin.ratings.sp), rr("Moody's", fin.ratings.moodys), rr('Fitch', fin.ratings.fitch)],
  );
  if (fin.ratings.note) pdf.note(fin.ratings.note[cl]);
  const wgiYear = Object.values(g).find(Boolean)?.year;
  pdf.table(
    [{ title: D.pol.wgi, w: 3 }, { title: wgiYear ?? '', w: 1, align: 'r' }],
    (Object.keys(WGI) as WgiKey[]).map(k => {
      const v = g[k]?.value;
      return [D.pol.wgiNames[k], v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf(Math.abs(v), lang, 2)}`];
    }),
  );
  if (wgiYear) pdf.note(fill(D.pol.wgiNote, { y: wgiYear }));

  // ---------- Заметки IMA/MPOC ----------
  if (src.notes.length) {
    pdf.h1(D.notes.title);
    for (const n of src.notes) {
      pdf.text(`${(D.notes.topics[n.topic] ?? n.topic).toUpperCase()}`, { size: 7, bold: true, color: undefined, gap: 1 });
      pdf.text(lang === 'ru' ? n.text_ru : n.text_en, { size: 9, gap: 1 });
      pdf.note(`${D.notes.kinds[n.source_kind] ?? n.source_kind} · ${n.source}${n.source_date ? ` · ${longDate(n.source_date, lang)}` : ''}`);
    }
  }

  // ---------- Источники ----------
  pdf.h1(S.sources);
  pdf.text(`${fill(D.src.curated, { d: longDate(PROFILES.updatedAt, lang) })} ${D.src.auto}`, { size: 8.5, gap: 4 });
  for (const s of [...p.political.sources, ...p.financial.sources]) {
    pdf.text(`${s.title} · ${fill(D.src.checked, { d: longDate(s.date, lang) })}\n${s.url}`, { size: 7.5, gap: 2 });
  }

  return pdf.finish();
}
