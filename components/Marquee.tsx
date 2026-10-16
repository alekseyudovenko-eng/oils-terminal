// Бегущая строка без JavaScript. Останавливается при наведении и фокусе;
// при «уменьшении движения» в настройках системы превращается в прокручиваемую полосу.
import type { ReactNode } from 'react';

type Props = { label: string; children: ReactNode; seconds?: number; className?: string };

export default function Marquee({ label, children, seconds = 60, className = '' }: Props) {
  return (
    <section aria-label={label} className={`marquee ${className}`}>
      <div className="marquee-track" style={{ ['--marquee-duration' as any]: `${seconds}s` }}>
        <div className="flex shrink-0">{children}</div>
        {/* Копия для бесшовной прокрутки: скрыта от экранных дикторов и клавиатуры. */}
        <div className="marquee-copy flex shrink-0" aria-hidden="true" {...({ inert: '' } as any)}>{children}</div>
      </div>
    </section>
  );
}
