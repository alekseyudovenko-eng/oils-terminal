// lib/snapshot.tsx — картинка «IMA Daily Snapshot» (1080×1350 PNG, английский, стиль Bloomberg):
// цена пальмового масла, нефть, курс ринггита и главные новости из отобранной ленты.
// Используется в /api/snapshot (просмотр) и /api/cron/daily-snapshot (публикация в Telegram).
import { ImageResponse } from 'next/og';
import { getQuotes, getQuotesFresh, type Quote } from './quotes';
import { getCuratedNews } from './news';
import { getDb } from './db';

const KEY_IDS = ['fcpo', 'brent', 'wti', 'usdmyr'] as const;
const hasPrice = (q: Quote | undefined) => q?.price != null;

/** Последние сохранённые значения из базы (снимки цен сайта): цена и изменение к предыдущему дню. */
async function storedQuotes(ids: string[]): Promise<{ quotes: Map<string, Quote>; day: string | null }> {
  const out = new Map<string, Quote>();
  let latestDay: string | null = null;
  const db = getDb();
  if (!db || ids.length === 0) return { quotes: out, day: null };
  try {
    const since = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
    const { data, error } = await db
      .from('price_snapshots')
      .select('day, series, price, usd_t, ticker')
      .in('series', ids)
      .gte('day', since)
      .order('day', { ascending: false });
    if (error) throw new Error(error.message);
    for (const id of ids) {
      const rows = (data || []).filter((r: any) => r.series === id && r.price != null);
      if (rows.length === 0) continue;
      const [last, prev] = rows;
      const price = Number(last.price);
      const prevPrice = prev ? Number(prev.price) : null;
      out.set(id, {
        id, name: id, short: id, venue: '', group: 'palm' as const, unit: '', ticker: last.ticker ?? null,
        price,
        changeAbs: prevPrice != null ? price - prevPrice : null,
        changePct: prevPrice ? ((price - prevPrice) / prevPrice) * 100 : null,
        perfW: null, perf1M: null, perfYTD: null,
        usdT: last.usd_t != null ? Number(last.usd_t) : null, prevUsdT: null,
      });
      if (!latestDay || last.day > latestDay) latestDay = last.day;
    }
  } catch (e) {
    console.warn('snapshot: stored quotes not loaded:', (e as Error).message);
  }
  return { quotes: out, day: latestDay };
}

/**
 * Котировки для картинки — те же данные, что на сайте, с запасными вариантами:
 * 1) свежий запрос к TradingView (до 2 попыток); 2) кэш сайта (то, что показывает страница);
 * 3) последние значения, сохранённые в базе. Так картинка выходит, даже если источник на минуту недоступен.
 */
async function snapshotQuotes(): Promise<{ quotes: Quote[]; fetchedAt: string; storedDay: string | null; sources: string[] }> {
  const merged = new Map<string, Quote>();
  const sources: string[] = [];
  let fetchedAt: string | null = null;
  const take = (list: Quote[], label: string, at: string) => {
    let used = false;
    for (const q of list) {
      if (q.price == null) continue;
      if (!merged.has(q.id)) { merged.set(q.id, q); used = true; }
    }
    if (used) { sources.push(label); if (!fetchedAt) fetchedAt = at; }
  };
  const missing = () => KEY_IDS.filter(id => !hasPrice(merged.get(id)));

  for (let attempt = 0; attempt < 2 && missing().length > 0; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
    const fresh = await getQuotesFresh();
    if (fresh.error) console.warn('snapshot: fresh quotes failed:', fresh.error);
    take(fresh.quotes, 'fresh', fresh.fetchedAt);
  }
  if (missing().length > 0) {
    const cached = await getQuotes();
    take(cached.quotes, 'site-cache', cached.fetchedAt);
  }
  let storedDay: string | null = null;
  const stillMissing = missing();
  if (stillMissing.length > 0) {
    const stored = await storedQuotes(stillMissing);
    for (const [id, q] of stored.quotes) merged.set(id, q);
    if (stored.quotes.size > 0) { sources.push('stored'); storedDay = stored.day; }
  }
  console.log('snapshot quotes from:', sources.join(', ') || 'none', 'missing:', missing().join(',') || '-');
  return { quotes: [...merged.values()], fetchedAt: fetchedAt ?? new Date().toISOString(), storedDay, sources };
}

const W = 1080, H = 1350;
const ORANGE = '#fb8b1e', UP = '#4ade80', DOWN = '#ff5a4f', MUTED = '#9a9a9a', DIM = '#7a7a7a', LINE = '#2a2a2a';

// Шрифт Inter (латиница). Если CDN недоступен — картинка рисуется шрифтом по умолчанию.
const FONT_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin';
async function loadFonts() {
  const weights = [400, 600, 700, 800] as const;
  try {
    const data = await Promise.all(weights.map(async w => {
      const r = await fetch(`${FONT_BASE}-${w}-normal.woff`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`font ${w}: HTTP ${r.status}`);
      return r.arrayBuffer();
    }));
    return weights.map((w, i) => ({ name: 'Inter', data: data[i], weight: w, style: 'normal' as const }));
  } catch (e) {
    console.warn('snapshot: fonts not loaded:', (e as Error).message);
    return undefined;
  }
}

const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
// Знаки + и - вместо стрелок: латинский набор шрифта не содержит ▲▼.
const pct = (v: number | null) => (v == null ? '' : `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}%`);
const col = (v: number | null) => (v == null || Math.abs(v) < 0.05 ? MUTED : v > 0 ? UP : DOWN);

/** Заголовок дня по движению цен — без оценок, только направление. */
function headline(palm: number | null, crude: number | null): string {
  const p = palm ?? 0, c = crude ?? 0;
  const pv = p >= 1.5 ? 'Jumps' : p >= 0.3 ? 'Rises' : p > -0.3 ? 'Holds Steady' : p > -1.5 ? 'Eases' : 'Slides';
  const cv = c >= 1 ? 'Crude Climbs' : c > 0.3 ? 'Crude Edges Higher' : c > -0.3 ? null : c > -1 ? 'Crude Edges Lower' : 'Crude Slips';
  return cv ? `Palm Oil ${pv} as ${cv}` : `Palm Oil ${pv}; Crude Little Changed`;
}

type Headline = { title: string; source: string; date: string };

/** Свежие новости с английским заголовком: за 2 дня (в понедельник — с пятницы), до 6 штук. */
function pickNews(now: Date): Headline[] {
  const back = now.getUTCDay() === 1 ? 3 : 2;
  const from = new Date(now.getTime() - back * 86400_000).toISOString().slice(0, 10);
  let items = getCuratedNews(now.getTime()).filter(n => n.publishedAt >= from && n.titleEn);
  if (items.length < 3) items = getCuratedNews(now.getTime()).filter(n => n.titleEn).slice(0, 6); // тихие дни — последние
  return items.slice(0, 6).map(n => ({
    title: n.titleEn!,
    source: n.source.replace(/УкрАгроКонсалт/g, 'UkrAgroConsult').replace(/\s*\([^)]*[А-Яа-яЁё][^)]*\)/g, '').trim(),
    date: new Date(n.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  }));
}

function PriceCell({ label, inst, value, unit, q, sub, last }: {
  label: string; inst: string; value: string; unit?: string; q: Quote | undefined; sub: string; last?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 323, padding: last ? '26px 0 28px 26px' : '26px 26px 28px 26px', borderRight: last ? 'none' : `1px solid ${LINE}` }}>
      <div style={{ color: ORANGE, fontSize: 17, fontWeight: 700, letterSpacing: 1.6 }}>{label}</div>
      <div style={{ color: '#8c8c8c', fontSize: 16, marginTop: 4 }}>{inst}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 16 }}>
        <div style={{ color: '#fff', fontSize: 62, fontWeight: 700, letterSpacing: -1.2 }}>{value}</div>
        {unit ? <div style={{ color: MUTED, fontSize: 21, marginLeft: 8 }}>{unit}</div> : null}
      </div>
      <div style={{ color: col(q?.changePct ?? null), fontSize: 24, fontWeight: 700, marginTop: 10 }}>{pct(q?.changePct ?? null) || '—'}</div>
      <div style={{ color: MUTED, fontSize: 17, marginTop: 10 }}>{sub}</div>
    </div>
  );
}

export async function renderSnapshot(now = new Date()): Promise<{ image: ImageResponse; ok: boolean; title: string }> {
  const [{ quotes, fetchedAt, storedDay }, fonts] = await Promise.all([snapshotQuotes(), loadFonts()]);
  const q = (id: string) => quotes.find(x => x.id === id);
  const fcpo = q('fcpo'), brent = q('brent'), wti = q('wti'), myr = q('usdmyr');
  const ok = fcpo?.price != null && brent?.price != null && myr?.price != null;
  const title = headline(fcpo?.changePct ?? null, brent?.changePct ?? null);
  const news = pickNews(now);
  const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).toUpperCase();
  const asOf = new Date(fetchedAt).toISOString().slice(11, 16);
  // Если часть цен взята из сохранённых в базе — честно пишем, что это последнее доступное закрытие.
  const asOfLine = storedDay
    ? `Market data: latest available (${new Date(`${storedDay}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}) · Delayed quotes`
    : `Market data as of ${asOf} UTC · Delayed quotes`;
  const ringgit = myr?.changePct == null || Math.abs(myr.changePct) < 0.05 ? 'Ringgit little changed against the dollar'
    : myr.changePct < 0 ? 'Ringgit firmer against the dollar' : 'Ringgit weaker against the dollar';

  const image = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#000', color: '#e6e6e6', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: ORANGE, color: '#000', padding: '22px 56px' }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 0.6 }}>IMA OILS</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{day}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 56px 0' }}>
          <div style={{ color: ORANGE, fontSize: 18, fontWeight: 700, letterSpacing: 2.8 }}>DAILY SNAPSHOT</div>
          <div style={{ color: '#fff', fontSize: 58, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, marginTop: 10 }}>{title}</div>
          <div style={{ color: MUTED, fontSize: 20, marginTop: 12 }}>{asOfLine}</div>
          <div style={{ display: 'flex', marginTop: 34, borderTop: `2px solid ${ORANGE}` }}>
            <PriceCell label="PALM OIL" inst="FCPO · Bursa Malaysia, 3rd month" q={fcpo}
              value={fcpo?.price != null ? fmt(fcpo.price) : '—'} unit="MYR/t"
              sub={fcpo?.usdT != null ? `US$${fmt(fcpo.usdT)}/t` : ''} />
            <PriceCell label="CRUDE OIL" inst="Brent · ICE, front month" q={brent}
              value={brent?.price != null ? fmt(brent.price, 2) : '—'} unit="$/bbl"
              sub={wti?.price != null ? `WTI ${fmt(wti.price, 2)}  ${pct(wti.changePct)}` : ''} />
            <PriceCell label="RINGGIT" inst="USD/MYR" q={myr} last
              value={myr?.price != null ? fmt(myr.price, 4) : '—'} sub={ringgit} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 30, paddingTop: 20, borderTop: `2px solid ${ORANGE}` }}>
            <div style={{ color: ORANGE, fontSize: 19, fontWeight: 700, letterSpacing: 2.8 }}>TOP HEADLINES</div>
            <div style={{ color: '#8c8c8c', fontSize: 16 }}>Curated by IMA</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            {news.length === 0 ? (
              <div style={{ color: MUTED, fontSize: 22, padding: '22px 0' }}>No new verified headlines.</div>
            ) : news.map((n, i) => (
              <div key={i} style={{ display: 'flex', padding: '19px 0', borderBottom: '1px solid #222' }}>
                <div style={{ color: ORANGE, fontSize: 24, fontWeight: 800, width: 44 }}>{String(i + 1)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', width: 924 }}>
                  <div style={{ color: '#fff', fontSize: 25, fontWeight: 700, lineHeight: 1.25 }}>{n.title}</div>
                  <div style={{ color: '#a8a8a8', fontSize: 17, marginTop: 6 }}>{`${n.source} · ${n.date}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', padding: '20px 56px', borderTop: `1px solid ${LINE}`, color: DIM, fontSize: 16 }}>
          <div style={{ display: 'flex' }}>
            <span>Source:</span><span style={{ color: ORANGE, fontWeight: 700, marginLeft: 6 }}>imaoils.vercel.app</span><span style={{ marginLeft: 6 }}>· TradingView, curated news</span>
          </div>
          <div>International Marketing Agency</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
  return { image, ok, title };
}
