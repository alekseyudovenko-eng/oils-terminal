'use client';
// components/SubscribeForm.tsx — форма подписки на еженедельный обзор рынка.
import { useState } from 'react';
import { EXTRA } from '@/lib/dict-extra';
import type { Locale } from '@/lib/i18n';

type State = 'idle' | 'sending' | 'ok' | 'already' | 'invalid' | 'error';

export default function SubscribeForm({ lang, source, compact = false }: { lang: Locale; source: string; compact?: boolean }) {
  const s = EXTRA[lang].sub;
  const [state, setState] = useState<State>('idle');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !/\S+@\S+\.\S+/.test(email)) { setState('invalid'); return; }
    setState('sending');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, company, consent, website, lang, source }),
      });
      const j = await r.json().catch(() => ({}));
      setState((['ok', 'already', 'invalid'] as const).includes(j.status) ? j.status : 'error');
    } catch { setState('error'); }
  }

  const input = 'w-full rounded border border-rule bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-gold outline-none';
  return (
    <section aria-labelledby={`sub-${source}`} className="rounded-lg border border-gold/40 bg-gold-soft/40 p-5">
      <h2 id={`sub-${source}`} className="font-cond text-xl font-semibold">{s.title}</h2>
      <p className="text-sm text-ink-2 mt-1 mb-4 max-w-[70ch]">{s.text}</p>
      {state === 'ok' || state === 'already' ? (
        <p role="status" className="text-sm font-medium text-up">{state === 'ok' ? s.ok : s.already}</p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-3">
          <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-3'}`}>
            <label className="grid gap-1 text-xs text-ink-2">{s.email}
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="name@company.com" />
            </label>
            {!compact && <label className="grid gap-1 text-xs text-ink-2">{s.name} <span className="sr-only">({s.optional})</span>
              <input type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={input} placeholder={s.optional} />
            </label>}
            {!compact && <label className="grid gap-1 text-xs text-ink-2">{s.company} <span className="sr-only">({s.optional})</span>
              <input type="text" autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} className={input} placeholder={s.optional} />
            </label>}
          </div>
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e => setWebsite(e.target.value)} className="hidden" name="website" />
          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--gold)]" />
            <span>{s.consent}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={state === 'sending'} className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-gold disabled:opacity-60">{s.button}</button>
            {(state === 'invalid' || state === 'error') && <p role="alert" className="text-sm text-down">{state === 'invalid' ? s.invalid : s.error}</p>}
          </div>
          <p className="text-xs text-ink-3">{s.privacy}</p>
        </form>
      )}
    </section>
  );
}
