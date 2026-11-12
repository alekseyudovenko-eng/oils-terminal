// lib/tv-history.ts — дневные цены закрытия за прошлые годы для графиков.
// Источник 1: TradingView (тот же, что и котировки), протокол веб-сокета графиков, без авторизации.
// Источник 2 (Далянь): дневные свечи Sina Finance по непрерывному основному контракту.
import WebSocket from 'ws';

export type Bar = { day: string; close: number };

export { CHART_IDS } from './chart-ids';

const TV_URL = 'wss://data.tradingview.com/socket.io/websocket?from=chart%2F&type=chart';
const frame = (m: string, p: unknown[]) => { const s = JSON.stringify({ m, p }); return `~m~${s.length}~m~${s}`; };
const rnd = (prefix: string) => prefix + Math.random().toString(36).slice(2, 14);

/** Дневные бары TradingView по символу (например MYX:FCPO1!). count — сколько последних дней. */
export function tvDailyBars(symbol: string, count: number, timeoutMs = 25000): Promise<Bar[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TV_URL, { headers: { Origin: 'https://www.tradingview.com', 'User-Agent': 'Mozilla/5.0' } });
    const cs = rnd('cs_');
    const bars = new Map<string, number>();
    let done = false;
    const seen: string[] = [];
    const finish = (err?: Error) => {
      if (done) return; done = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* уже закрыт */ }
      if (err && bars.size === 0) reject(err);
      else resolve(Array.from(bars.entries()).map(([day, close]) => ({ day, close })).sort((a, b) => a.day.localeCompare(b.day)));
    };
    const timer = setTimeout(() => finish(new Error(`TradingView ${symbol}: timeout; seen ${seen.join(',').slice(0, 300)}`)), timeoutMs);

    ws.on('unexpected-response', (_req: unknown, res: { statusCode?: number }) => finish(new Error(`TradingView ${symbol}: HTTP ${res.statusCode}`)));
    ws.on('open', () => {
      seen.push('open');
      ws.send(frame('set_auth_token', ['unauthorized_user_token']));
      ws.send(frame('chart_create_session', [cs, '']));
      ws.send(frame('resolve_symbol', [cs, 'sym_1', '=' + JSON.stringify({ symbol, adjustment: 'splits', session: 'regular' })]));
      ws.send(frame('create_series', [cs, 's1', 's1', 'sym_1', '1D', count, '']));
    });
    ws.on('message', (raw: WebSocket.RawData) => {
      const text = raw.toString();
      // В одном сообщении может быть несколько пакетов ~m~len~m~payload.
      let i = 0;
      while (i < text.length) {
        const m = /^~m~(\d+)~m~/.exec(text.slice(i));
        if (!m) break;
        const len = Number(m[1]);
        const start = i + m[0].length;
        const payload = text.slice(start, start + len);
        i = start + len;
        if (payload.startsWith('~h~')) { ws.send(`~m~${payload.length}~m~${payload}`); continue; }
        let msg: any;
        try { msg = JSON.parse(payload); } catch { seen.push('raw:' + payload.slice(0, 40)); continue; }
        if (seen.length < 12) seen.push(String(msg.m ?? Object.keys(msg).join('+')) + (msg.m === 'symbol_error' || msg.m === 'critical_error' ? ':' + JSON.stringify(msg.p).slice(0, 80) : ''));
        if (msg.m === 'timescale_update' || msg.m === 'du') {
          const s = msg.p?.[1]?.s1?.s;
          if (Array.isArray(s)) for (const b of s) {
            const v = b?.v; if (!Array.isArray(v) || v.length < 5) continue;
            // Время бара — начало торгового дня по часам биржи; +12 ч даёт верную дату и для Азии, и для США.
            const day = new Date((Number(v[0]) + 12 * 3600) * 1000).toISOString().slice(0, 10);
            const close = Number(v[4]);
            if (Number.isFinite(close)) bars.set(day, close);
          }
        } else if (msg.m === 'series_completed') {
          finish();
        } else if (msg.m === 'symbol_error' || msg.m === 'series_error' || msg.m === 'critical_error') {
          finish(new Error(`TradingView ${symbol}: ${msg.m} ${JSON.stringify(msg.p).slice(0, 200)}`));
        }
      }
    });
    ws.on('error', (e: Error) => finish(e));
    ws.on('close', () => finish(new Error(`TradingView ${symbol}: closed`)));
  });
}

/** Дневные свечи Sina Finance (китайские фьючерсы, например P0 — пальмовый олеин DCE). */
export async function sinaDailyBars(code: string): Promise<Bar[]> {
  const url = `https://stock2.finance.sina.com.cn/futures/api/json.php/IndexService.getInnerFuturesDailyKLine?symbol=${encodeURIComponent(code)}`;
  const res = await fetch(url, { headers: { Referer: 'https://finance.sina.com.cn/' }, cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Sina ${code}: HTTP ${res.status}`);
  const data = await res.json();
  // Формат: [["2026-11-12","open","high","low","close","volume"], ...]
  if (!Array.isArray(data)) throw new Error(`Sina ${code}: unexpected response`);
  return data
    .map((r: any[]) => ({ day: String(r[0]).slice(0, 10), close: Number(r[4]) }))
    .filter((b: Bar) => /^\d{4}-\d{2}-\d{2}$/.test(b.day) && Number.isFinite(b.close) && b.close > 0);
}
