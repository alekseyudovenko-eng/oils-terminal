// lib/physical.ts — физические цены пальмовых продуктов (FOB, USD/т) со страницы
// https://www.zyotwdhon.com/en/palm-oil-daily-prices (портал «Zyot W Dhon»).
// Данные чужие («All rights reserved»): используем только во внутренних отчётах IMA, на сайте не публикуем.

export const PHYSICAL_URL = 'https://www.zyotwdhon.com/en/palm-oil-daily-prices';
export const PHYSICAL_SOURCE = 'zyotwdhon.com';

export type PhysicalRow = { product: string; price_usd: number | null; change_usd: number | null };
export type PhysicalPage = { day: string; rows: PhysicalRow[] };

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();

/** «$1037.5» → 1037.5; «$10-» → −10; «$5+» / «$5» → 5. */
function money(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/(-)?\$?\s*(\d+(?:\.\d+)?)\s*([+-])?/);
  if (!m) return null;
  const v = Number(m[2]);
  return m[1] === '-' || m[3] === '-' ? -v : v;
}

export function parsePhysical(html: string): PhysicalPage {
  // Дата закрытия: бейдж вида «27 October 2026».
  const dm = html.match(/>\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d\d)\s*</i);
  if (!dm) throw new Error('дата цены не найдена');
  const day = `${dm[3]}-${String(MONTHS[dm[2].toLowerCase()]).padStart(2, '0')}-${dm[1].padStart(2, '0')}`;

  // Строки таблицы «Daily FOB Prices»: название (англ.) + цена + изменение.
  const rows: PhysicalRow[] = [];
  const parts = html.split('class="zwd-pp-row"').slice(1);
  for (const part of parts) {
    const name = part.match(/class="zwd-pp-name-ar">([^<]+)</)?.[1];
    const nums = Array.from(part.matchAll(/class="zwd-pp-num[^"]*">([^<]*)</g)).map(m => m[1]);
    if (!name || !nums.length) continue;
    rows.push({ product: decode(name), price_usd: money(nums[0]), change_usd: money(nums[1]) });
  }
  if (rows.length < 3) throw new Error(`разобрано только ${rows.length} строк — изменилась вёрстка страницы?`);
  return { day, rows };
}

export async function fetchPhysical(): Promise<PhysicalPage> {
  const res = await fetch(PHYSICAL_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IMA-Reports/1.0)', Accept: 'text/html' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${PHYSICAL_SOURCE}: HTTP ${res.status}`);
  return parsePhysical(await res.text());
}
