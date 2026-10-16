// Простой линейный график истории спреда (SVG, без библиотек).
import { fmtDate, fmtSigned } from '@/lib/format';
import type { Point } from '@/lib/snapshots';

export default function Sparkline({ points, label }: { points: Point[]; label: string }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-ink-3">
        История {label} начнёт копиться с первого ежедневного снимка. График появится через пару рабочих дней.
      </p>
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
        aria-label={`${label}: от ${fmtSigned(points[0].value)} до ${fmtSigned(last.value)} долларов за тонну`}>
        <line x1={P} x2={W - P} y1={y(0)} y2={y(0)} stroke="var(--rule)" strokeWidth="1" />
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill="var(--gold)" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-ink-3 num">
        <span>{fmtDate(points[0].day)}</span>
        <span>серая линия — ноль</span>
        <span>{fmtDate(last.day)}: {fmtSigned(last.value)} $/т</span>
      </figcaption>
    </figure>
  );
}
