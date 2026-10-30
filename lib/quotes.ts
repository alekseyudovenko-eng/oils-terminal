// lib/quotes.ts — котировки и спреды (POGO и др.).
import { unstable_cache } from 'next/cache';
import { rethrowIfNextInternal } from './next-errors';
import {
  CENTS_LB_TO_USD_T, GAL_PER_TONNE_DIESEL, INSTRUMENTS, Instrument, Group, tickersFor,
} from './instruments';

export type Quote = {
  id: string;
  name: string;
  short: string;
  venue: string;
  group: Group;
  unit: string;
  ticker: string | null;
  price: number | null;
  changeAbs: number | null;
  changePct: number | null;
  perfW: number | null;
  perf1M: number | null;
  perfYTD: number | null;
  usdT: number | null;       // цена в USD/т (если применимо)
  prevUsdT: number | null;   // вчерашнее закрытие в USD/т (по сегодняшнему курсу)
};

export type Spread = {
  id: string;
  name: string;
  short: string;
  value: number | null;      // USD/т
  change: number | null;     // изменение за день, USD/т
  formula: string;
  explain: string | null;    // простая фраза для главной
  proxy: boolean;            // газойль заменён на ULSD
};

export type QuotesResult = {
  quotes: Quote[];
  spreads: Spread[];
  fetchedAt: string;
  error: string | null;
};

const SCANNER_URL = 'https://scanner.tradingview.com/global/scan';
const COLUMNS = ['close', 'change', 'change_abs', 'Perf.W', 'Perf.1M', 'Perf.YTD', 'description'] as const;

type Row = { close: number; changePct: number; changeAbs: number; perfW: number; perf1M: number; perfYTD: number; description: string };

async function fetchScanner(tickers: string[]): Promise<Map<string, Row>> {
  const res = await fetch(SCANNER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; OilsTerminal/2.0)',
    },
    body: JSON.stringify({ symbols: { tickers, query: { types: [] } }, columns: COLUMNS }),
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`TradingView HTTP ${res.status}`);
  const json = await res.json();
  const map = new Map<string, Row>();
  for (const item of json?.data || []) {
    const d = item.d || [];
    if (typeof d[0] !== 'number') continue;
    map.set(item.s, {
      close: d[0], changePct: d[1], changeAbs: d[2], perfW: d[3], perf1M: d[4], perfYTD: d[5],
      description: String(d[6] || ''),
    });
  }
  return map;
}

const SINA_URL = 'https://hq.sinajs.cn/list=';

type SinaRow = { close: number; changeAbs: number; changePct: number };

/**
 * Котировки Даляньской биржи из Sina Finance (TradingView их не отдаёт).
 * Формат строки nf_*: 0 название, 2 открытие, 3 макс., 4 мин., 8 последняя цена, 10 расчётная цена вчера.
 * Ошибки не роняют страницу: инструмент просто остаётся пустым.
 */
async function fetchSina(codes: string[]): Promise<Map<string, SinaRow>> {
  const map = new Map<string, SinaRow>();
  if (!codes.length) return map;
  try {
    const res = await fetch(SINA_URL + codes.map(c => `nf_${c}`).join(','), {
      headers: { Referer: 'https://finance.sina.com.cn/', 'User-Agent': 'Mozilla/5.0 (compatible; OilsTerminal/2.0)' },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Sina HTTP ${res.status}`);
    const text = await res.text();
    for (const m of Array.from(text.matchAll(/hq_str_nf_(\w+)="([^"]*)"/g))) {
      const f = m[2].split(',');
      const last = Number(f[8]);
      const prevSettle = Number(f[10]);
      // Защита от мусора: цены масел на DCE — тысячи юаней за тонну.
      if (!(last > 1000 && last < 50000) || !(prevSettle > 1000 && prevSettle < 50000)) continue;
      const changeAbs = last - prevSettle;
      map.set(m[1], { close: last, changeAbs, changePct: (changeAbs / prevSettle) * 100 });
    }
  } catch (e: any) {
    rethrowIfNextInternal(e);
    console.error(`Котировки Sina недоступны: ${e?.message || e}`);
  }
  return map;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function toUsdT(inst: Instrument, price: number | null, fx: Record<string, number | null>): number | null {
  if (price == null) return null;
  const c = inst.toUsdT;
  switch (c.kind) {
    case 'usd_t': return price;
    case 'cents_lb': return price * CENTS_LB_TO_USD_T;
    case 'usd_gal': return price * GAL_PER_TONNE_DIESEL;
    case 'eur_t': return fx.EURUSD ? price * fx.EURUSD : null;
    case 'fx_t': return fx[c.fx] ? price / (fx[c.fx] as number) : null;
    default: return null;
  }
}

function spread(
  id: string, name: string, short: string, formula: string,
  a: Quote | undefined, b: Quote | undefined, proxy = false,
): Spread {
  const value = a?.usdT != null && b?.usdT != null ? a.usdT - b.usdT : null;
  const prev = a?.prevUsdT != null && b?.prevUsdT != null ? a.prevUsdT - b.prevUsdT : null;
  return {
    id, name, short, formula, proxy, explain: null,
    value: value == null ? null : Math.round(value),
    change: value != null && prev != null ? Math.round(value - prev) : null,
  };
}

async function loadQuotes(): Promise<QuotesResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const allTickers = Array.from(new Set(INSTRUMENTS.flatMap(i => tickersFor(i, now))));

  let rows = new Map<string, Row>();
  let error: string | null = null;
  try {
    rows = await fetchScanner(allTickers);
  } catch (e: any) {
    rethrowIfNextInternal(e);
    error = `Котировки недоступны: ${e?.message || e}`;
    console.error(error);
  }

  // Инструменты, которых нет на TradingView, добираем из Sina (параллельно сканеру не нужно: запрос короткий).
  const sinaCodes = INSTRUMENTS.filter(i => i.sina).map(i => i.sina as string);
  const sina = await fetchSina(sinaCodes);

  const pick = (inst: Instrument) => {
    for (const t of tickersFor(inst, now)) {
      const r = rows.get(t);
      if (r && (!inst.expect || inst.expect.test(r.description))) return { ticker: t, row: r };
    }
    return null;
  };

  const fx: Record<string, number | null> = {
    USDMYR: num(rows.get('FX_IDC:USDMYR')?.close),
    USDCNY: num(rows.get('FX_IDC:USDCNY')?.close),
    EURUSD: num(rows.get('FX:EURUSD')?.close),
  };

  const quotes: Quote[] = INSTRUMENTS.map(inst => {
    const hit = pick(inst);
    const sr = !hit && inst.sina ? sina.get(inst.sina) : undefined;
    if (sr) {
      const prevSr = sr.close - sr.changeAbs;
      return {
        id: inst.id, name: inst.name, short: inst.short, venue: inst.venue, group: inst.group, unit: inst.unit,
        ticker: `SINA:nf_${inst.sina}`,
        price: sr.close,
        changeAbs: sr.changeAbs,
        changePct: sr.changePct,
        perfW: null, perf1M: null, perfYTD: null,
        usdT: toUsdT(inst, sr.close, fx),
        prevUsdT: toUsdT(inst, prevSr, fx),
      };
    }
    const price = num(hit?.row.close);
    const changeAbs = num(hit?.row.changeAbs);
    const prev = price != null && changeAbs != null ? price - changeAbs : null;
    return {
      id: inst.id, name: inst.name, short: inst.short, venue: inst.venue, group: inst.group, unit: inst.unit,
      ticker: hit?.ticker ?? null,
      price,
      changeAbs,
      changePct: num(hit?.row.changePct),
      perfW: num(hit?.row.perfW),
      perf1M: num(hit?.row.perf1M),
      perfYTD: num(hit?.row.perfYTD),
      usdT: toUsdT(inst, price, fx),
      prevUsdT: toUsdT(inst, prev, fx),
    };
  });

  const q = (id: string) => quotes.find(x => x.id === id && x.price != null);
  const gasoilIce = q('gasoil');
  const gasoil = gasoilIce ?? q('ulsd');
  const proxy = !gasoilIce && !!gasoil;
  const gasoilLabel = proxy ? 'ULSD NYMEX в USD/т' : 'газойль ICE';

  const pogo = spread('pogo', 'POGO', 'POGO', `FCPO в USD/т − ${gasoilLabel}`, q('fcpo'), gasoil, proxy);
  if (pogo.value != null) {
    const abs = Math.abs(pogo.value).toLocaleString('ru-RU');
    pogo.explain = pogo.value < 0
      ? `Пальмовое масло дешевле газойля на $${abs} за тонну: биодизель из пальмы выгоден даже без мандатов.`
      : `Пальмовое масло дороже газойля на $${abs} за тонну: спрос на биодизель из пальмы держится на мандатах.`;
  }

  const spreads: Spread[] = [
    pogo,
    spread('bogo', 'BOGO', 'BOGO', `Соевое масло CBOT в USD/т − ${gasoilLabel}`, q('zl'), gasoil, proxy),
    spread('soy_palm', 'Соя − пальма', 'Соя−пальма', 'Соевое масло CBOT − FCPO, оба в USD/т', q('zl'), q('fcpo')),
  ];

  // Пустой результат не кэшируем: бросаем ошибку, и следующий заход попробует снова.
  if (error || quotes.every(x => x.price == null)) throw new Error(error || 'Котировки недоступны: источник не вернул данных');
  return { quotes, spreads, fetchedAt, error: null };
}

const cachedQuotes = unstable_cache(loadQuotes, ['quotes-v2'], { revalidate: 600 });

function emptyResult(message: string): QuotesResult {
  return {
    quotes: INSTRUMENTS.map(inst => ({
      id: inst.id, name: inst.name, short: inst.short, venue: inst.venue, group: inst.group, unit: inst.unit,
      ticker: null, price: null, changeAbs: null, changePct: null, perfW: null, perf1M: null, perfYTD: null,
      usdT: null, prevUsdT: null,
    })),
    spreads: [],
    fetchedAt: new Date().toISOString(),
    error: message,
  };
}

/** Кэш на 10 минут: страница не обращается к источнику при каждом заходе. */
export async function getQuotes(): Promise<QuotesResult> {
  try {
    return await cachedQuotes();
  } catch (e: any) {
    rethrowIfNextInternal(e);
    return emptyResult(String(e?.message || e));
  }
}

/** Без кэша — для cron-задач. */
export async function getQuotesFresh(): Promise<QuotesResult> {
  try {
    return await loadQuotes();
  } catch (e: any) {
    rethrowIfNextInternal(e);
    return emptyResult(String(e?.message || e));
  }
}
