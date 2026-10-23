// Простой линейный график истории спреда (SVG, без библиотек).
import { fmtDate, fmtSigned } from '@/lib/format';
import type { Point } from '@/lib/snapshots';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';

export default function Sparkline({ points, label }: { points: Point[]; label: string }) {
  const { lang, t } = getDict();
  if (points.length < 2) {
    return (
      <p className="text-sm text-ink-3">{fill(t.spark.empty, { label })}</p>
    );
  }
  const W = 640, H = 160, P = 4;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0);
  const span = max - min || 1;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - min) / span) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img"
        aria-label={fill(t.spark.aria, { label, a: fmtSigned(points[0].value, 0, lang), b: fmtSigned(last.value, 0, lang) })}>
        <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--rule)" strokeWidth="1" />
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill="var(--gold)" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-ink-3 num">
        <span>{fmtDate(points[0].day, lang)}</span>
        <span>{t.spark.zero}</span>
        <span>{fmtDate(last.day, lang)}: {fmtSigned(last.value, 0, lang)} $/{t.t}</span>
      </figcaption>
    </figure>
  );
}
