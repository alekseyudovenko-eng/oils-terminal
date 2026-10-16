import type { ReactNode } from 'react';

export default function Section({
  id, title, note, children, action,
}: { id: string; title: string; note?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 py-8 border-b border-rule last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-3">
        <h2 id={`${id}-title`} className="font-cond text-2xl font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {note && <p className="text-sm text-ink-2 mb-4 max-w-[75ch]">{note}</p>}
      {children}
    </section>
  );
}
