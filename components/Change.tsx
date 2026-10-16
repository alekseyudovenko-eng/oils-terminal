import { fmtPct, fmtSigned, trend } from '@/lib/format';

const COLOR = { up: 'text-up', down: 'text-down', flat: 'text-ink-3' } as const;
const ARROW = { up: '▲', down: '▼', flat: '' } as const;

/** Изменение в процентах или в абсолютных единицах, с цветом и стрелкой. */
export default function Change({
  value, kind = 'pct', arrow = false, className = '',
}: { value: number | null; kind?: 'pct' | 'abs'; arrow?: boolean; className?: string }) {
  const t = trend(value);
  return (
    <span className={`num ${COLOR[t]} ${className}`}>
      {arrow && ARROW[t] && <span aria-hidden="true" className="mr-0.5 text-[0.7em] align-[0.1em]">{ARROW[t]}</span>}
      {kind === 'pct' ? fmtPct(value) : fmtSigned(value)}
    </span>
  );
}
