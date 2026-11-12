// lib/pdf-doc.ts — маленький конструктор PDF на бланке IMA (pdf-lib, шрифт Liberation Sans с кириллицей).
// Только вёрстка: страницы A4, шапка-бланк, колонтитул, абзацы, плитки, таблицы, столбчатая диаграмма.
import { PDFDocument, PDFFont, PDFPage, rgb, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Цвета сайта (app/globals.css).
const INK = rgb(0x17 / 255, 0x24 / 255, 0x1f / 255);
const INK2 = rgb(0x4a / 255, 0x5a / 255, 0x53 / 255);
const INK3 = rgb(0x7c / 255, 0x8a / 255, 0x83 / 255);
const GOLD = rgb(0xa8 / 255, 0x76 / 255, 0x12 / 255);
const GOLD_SOFT = rgb(0xf4 / 255, 0xe8 / 255, 0xc8 / 255);
const RULE = rgb(0xd5 / 255, 0xdb / 255, 0xd2 / 255);
const WHITE = rgb(1, 1, 1);

const W = 595.28, H = 841.89;       // A4, pt
const MX = 42;                      // боковые поля
const TOP_FIRST = 132;              // высота бланка на первой странице
const TOP_NEXT = 52;                // на остальных
const BOTTOM = 52;

/** Пробелы и знаки, которых нет в шрифте, приводим к обычным. */
const clean = (s: string) => s.replace(/[    ]/g, ' ').replace(/[​-‏⁠]/g, '');

async function font(file: string) {
  return readFile(path.join(process.cwd(), 'assets', 'fonts', file));
}

export type Align = 'l' | 'r';
export type Col = { title: string; w: number; align?: Align };   // w — доля ширины таблицы

export type ReportMeta = {
  title: string;          // «Отчёт по стране»
  subtitle: string;       // название страны
  dateLine: string;       // «12 ноября 2026»
  org: string;            // «International Marketing Agency · IMA»
  footer: string;         // конфиденциальность
  pageWord: string;       // «Стр.»
};

export class Pdf {
  private constructor(
    private doc: PDFDocument, private reg: PDFFont, private bold: PDFFont,
    private meta: ReportMeta,
  ) {
    this.newPage();
  }
  private page!: PDFPage;
  private y = 0;
  private pages: PDFPage[] = [];

  static async create(meta: ReportMeta) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const reg = await doc.embedFont(await font('LiberationSans-Regular.ttf'), { subset: true });
    const bold = await doc.embedFont(await font('LiberationSans-Bold.ttf'), { subset: true });
    doc.setTitle(`${meta.title}: ${meta.subtitle}`);
    doc.setAuthor('IMA');
    doc.setCreator('Oils Terminal · IMA Lab');
    return new Pdf(doc, reg, bold, meta);
  }

  // ---- страницы и бланк ----
  private newPage() {
    const p = this.doc.addPage([W, H]);
    this.page = p;
    const first = this.pages.length === 0;
    this.pages.push(p);
    // полоса бланка
    const bandH = first ? TOP_FIRST - 26 : 30;
    p.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: INK });
    p.drawRectangle({ x: 0, y: H - bandH - 2.5, width: W, height: 2.5, color: GOLD });
    p.drawText('IMA', { x: MX, y: H - (first ? 44 : 20), size: first ? 26 : 13, font: this.bold, color: WHITE });
    const imaW = this.bold.widthOfTextAtSize('IMA', first ? 26 : 13);
    p.drawText(clean(this.meta.org), { x: MX + imaW + 10, y: H - (first ? 43 : 19.5), size: first ? 9.5 : 8, font: this.reg, color: rgb(0.62, 0.69, 0.66) });
    if (first) {
      p.drawText(clean(this.meta.title).toUpperCase(), { x: MX, y: H - 68, size: 9, font: this.bold, color: GOLD_SOFT });
      p.drawText(clean(this.meta.subtitle), { x: MX, y: H - 90, size: 20, font: this.bold, color: WHITE });
      const d = clean(this.meta.dateLine);
      p.drawText(d, { x: W - MX - this.reg.widthOfTextAtSize(d, 9.5), y: H - 43, size: 9.5, font: this.reg, color: rgb(0.62, 0.69, 0.66) });
    } else {
      const t = clean(`${this.meta.title}: ${this.meta.subtitle}`);
      p.drawText(t, { x: W - MX - this.reg.widthOfTextAtSize(t, 8), y: H - 19.5, size: 8, font: this.reg, color: rgb(0.62, 0.69, 0.66) });
    }
    this.y = H - (first ? TOP_FIRST + 6 : TOP_NEXT + 4);
  }

  private ensure(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }

  // ---- текст ----
  private wrap(text: string, f: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of clean(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(test, size) <= width) { line = test; continue; }
        if (line) out.push(line);
        // слишком длинное слово — режем по символам
        let w = word;
        while (f.widthOfTextAtSize(w, size) > width) {
          let n = w.length - 1;
          while (n > 1 && f.widthOfTextAtSize(w.slice(0, n), size) > width) n--;
          out.push(w.slice(0, n)); w = w.slice(n);
        }
        line = w;
      }
      out.push(line);
    }
    return out;
  }

  /** Абзац с переносами; возвращает число строк. */
  text(s: string, o: { size?: number; bold?: boolean; color?: RGB; x?: number; width?: number; gap?: number; lead?: number } = {}) {
    const size = o.size ?? 9.5, f = o.bold ? this.bold : this.reg;
    const x = o.x ?? MX, width = o.width ?? W - MX - x;
    const lead = o.lead ?? size * 1.4;
    const lines = this.wrap(s, f, size, width);
    for (const ln of lines) {
      this.ensure(lead);
      this.y -= lead;
      this.page.drawText(ln, { x, y: this.y + size * 0.28, size, font: f, color: o.color ?? INK });
    }
    this.y -= o.gap ?? 4;
    return lines.length;
  }

  note(s: string) { this.text(s, { size: 7.5, color: INK3, gap: 6 }); }

  space(n: number) { this.y -= n; }

  h1(s: string) {
    this.ensure(46);
    this.y -= 16;
    this.page.drawText(clean(s), { x: MX, y: this.y, size: 13.5, font: this.bold, color: INK });
    this.y -= 5;
    this.page.drawRectangle({ x: MX, y: this.y, width: 26, height: 2, color: GOLD });
    this.y -= 6;
  }

  h2(s: string) {
    this.ensure(34);
    this.y -= 8;
    this.page.drawText(clean(s), { x: MX, y: this.y, size: 10, font: this.bold, color: INK2 });
    this.y -= 4;
  }

  /** Плитки «значение + подпись» в ряд (до 4 в ряду). */
  tiles(items: [string, string, string?][]) {
    const per = 4, cw = (W - 2 * MX) / per;
    for (let i = 0; i < items.length; i += per) {
      const row = items.slice(i, i + per);
      this.ensure(46);
      const top = this.y - 4;
      row.forEach(([k, v, hint], j) => {
        const x = MX + j * cw;
        this.page.drawLine({ start: { x, y: top }, end: { x: x + cw - 10, y: top }, thickness: 0.6, color: RULE });
        const kl = this.wrap(k, this.reg, 7.5, cw - 12)[0] ?? '';
        this.page.drawText(kl, { x, y: top - 11, size: 7.5, font: this.reg, color: INK3 });
        let vs = 14;
        const vv = clean(v);
        while (vs > 8 && this.bold.widthOfTextAtSize(vv, vs) > cw - 12) vs--;
        this.page.drawText(vv, { x, y: top - 27, size: vs, font: this.bold, color: INK });
        if (hint) this.page.drawText(clean(hint), { x, y: top - 37, size: 7, font: this.reg, color: INK3 });
      });
      this.y = top - 44;
    }
  }

  /** Пары «название — значение» в две колонки. */
  facts(items: [string, string][]) {
    const cw = (W - 2 * MX) / 2;
    for (let i = 0; i < items.length; i += 2) {
      const row = items.slice(i, i + 2);
      const lines = row.map(([k, v]) => ({ k, l: this.wrap(v || '—', this.reg, 9, cw - 18) }));
      const h = 14 + Math.max(...lines.map(x => x.l.length)) * 12.2 + 4;
      this.ensure(h);
      const top = this.y - 2;
      lines.forEach(({ k, l }, j) => {
        const x = MX + j * cw;
        this.page.drawLine({ start: { x, y: top }, end: { x: x + cw - 14, y: top }, thickness: 0.5, color: RULE });
        this.page.drawText(clean(k), { x, y: top - 10, size: 7.5, font: this.reg, color: INK3 });
        l.forEach((t, n) => this.page.drawText(t, { x, y: top - 22 - n * 12.2, size: 9, font: this.reg, color: INK }));
      });
      this.y = top - h + 2;
    }
    this.y -= 2;
  }

  /** Таблица. rows — строки ячеек; opts.boldRows — индексы выделенных строк, hi — подсвеченных. */
  table(cols: Col[], rows: string[][], o: { boldRows?: number[]; hiRows?: number[]; size?: number } = {}) {
    const size = o.size ?? 8.5, total = W - 2 * MX;
    const sum = cols.reduce((a, c) => a + c.w, 0);
    const widths = cols.map(c => (c.w / sum) * total);
    const xs = widths.map((_, i) => MX + widths.slice(0, i).reduce((a, b) => a + b, 0));
    const pad = 5;

    const head = () => {
      const lines = cols.map((c, i) => this.wrap(c.title, this.reg, 7.5, widths[i] - 2 * pad));
      const h = Math.max(...lines.map(l => l.length)) * 9.5 + 7;
      this.ensure(h + 24);
      const top = this.y;
      lines.forEach((l, i) => l.forEach((t, n) => {
        const w = this.reg.widthOfTextAtSize(t, 7.5);
        const x = cols[i].align === 'r' ? xs[i] + widths[i] - pad - w : xs[i] + pad;
        this.page.drawText(t, { x, y: top - 9 - n * 9.5, size: 7.5, font: this.reg, color: INK3 });
      }));
      this.y = top - h;
      this.page.drawLine({ start: { x: MX, y: this.y }, end: { x: W - MX, y: this.y }, thickness: 0.8, color: INK3 });
    };
    const hasHead = cols.some(c => c.title);
    if (hasHead) head();
    else this.page.drawLine({ start: { x: MX, y: this.y }, end: { x: W - MX, y: this.y }, thickness: 0.8, color: INK3 });
    rows.forEach((r, ri) => {
      const f = o.boldRows?.includes(ri) ? this.bold : this.reg;
      const cells = r.map((c, i) => this.wrap(c, f, size, widths[i] - 2 * pad));
      const h = Math.max(...cells.map(c => c.length)) * (size + 2.4) + 6;
      if (this.y - h < BOTTOM) { this.newPage(); if (hasHead) head(); }
      const top = this.y;
      if (o.hiRows?.includes(ri)) this.page.drawRectangle({ x: MX, y: top - h, width: total, height: h, color: GOLD_SOFT, opacity: 0.55 });
      cells.forEach((lines, i) => lines.forEach((t, n) => {
        const w = f.widthOfTextAtSize(t, size);
        const x = cols[i].align === 'r' ? xs[i] + widths[i] - pad - w : xs[i] + pad;
        this.page.drawText(t, { x, y: top - 3 - size - n * (size + 2.4) + 1, size, font: f, color: INK });
      }));
      this.y = top - h;
      this.page.drawLine({ start: { x: MX, y: this.y }, end: { x: W - MX, y: this.y }, thickness: 0.4, color: RULE });
    });
    this.y -= 6;
  }

  /** Столбцы по годам: серый — всего, золотой — из Малайзии. */
  bars(bars: { label: string; total: number; my: number; faded?: boolean }[], caption: string, unitNote: string) {
    if (!bars.length) return;
    const ch = 92, bw = Math.min(34, (W - 2 * MX - 20) / bars.length);
    this.ensure(ch + 70);
    this.h2(caption);
    this.ensure(ch + 36);
    const base = this.y - ch - 12;
    const max = Math.max(...bars.map(b => b.total), 1);
    bars.forEach((b, i) => {
      const x = MX + 6 + i * (bw + 6);
      const th = (b.total / max) * ch, mh = (b.my / max) * ch;
      const op = b.faded ? 0.45 : 1;
      this.page.drawRectangle({ x, y: base, width: bw, height: Math.max(th, 0.5), color: RULE, opacity: op });
      this.page.drawRectangle({ x, y: base, width: bw, height: Math.max(mh, 0), color: GOLD, opacity: op });
      const v = clean(String(Math.round(b.total / 1000)));
      this.page.drawText(v, { x: x + bw / 2 - this.reg.widthOfTextAtSize(v, 7.5) / 2, y: base + th + 3, size: 7.5, font: this.reg, color: INK2 });
      const l = clean(b.label);
      this.page.drawText(l, { x: x + bw / 2 - this.reg.widthOfTextAtSize(l, 7.5) / 2, y: base - 10, size: 7.5, font: this.reg, color: INK3 });
    });
    this.y = base - 16;
    this.note(unitNote);
  }

  /** Рамка-врезка (жёлтая) для ключевого вывода. */
  callout(s: string) {
    const lines = this.wrap(s, this.reg, 9, W - 2 * MX - 20);
    const h = lines.length * 12.6 + 12;
    this.ensure(h + 6);
    this.page.drawRectangle({ x: MX, y: this.y - h, width: W - 2 * MX, height: h, color: GOLD_SOFT, opacity: 0.6 });
    this.page.drawRectangle({ x: MX, y: this.y - h, width: 2.5, height: h, color: GOLD });
    lines.forEach((t, n) => this.page.drawText(t, { x: MX + 10, y: this.y - 14 - n * 12.6, size: 9, font: this.reg, color: INK }));
    this.y -= h + 8;
  }

  async finish(): Promise<Uint8Array> {
    const n = this.pages.length;
    this.pages.forEach((p, i) => {
      p.drawLine({ start: { x: MX, y: 36 }, end: { x: W - MX, y: 36 }, thickness: 0.5, color: RULE });
      const f = clean(this.meta.footer);
      let size = 7;
      while (size > 5.5 && this.reg.widthOfTextAtSize(f, size) > W - 2 * MX - 60) size -= 0.5;
      p.drawText(f, { x: MX, y: 24, size, font: this.reg, color: INK3 });
      const pg = `${this.meta.pageWord} ${i + 1} / ${n}`;
      p.drawText(pg, { x: W - MX - this.reg.widthOfTextAtSize(pg, 7.5), y: 24, size: 7.5, font: this.reg, color: INK3 });
    });
    return this.doc.save();
  }
}
