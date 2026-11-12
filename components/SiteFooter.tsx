import { fmtTimeUtc } from '@/lib/format';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';
import { EXTRA } from '@/lib/dict-extra';
import { localePath } from '@/lib/i18n';

export default function SiteFooter({ updatedAt }: { updatedAt: string | null }) {
  const { lang, t } = getDict();
  return (
    <footer className="mt-auto border-t border-rule bg-panel text-xs text-ink-3">
      <div className="mx-auto max-w-page px-4 sm:px-6 py-5 grid gap-1">
        <p className="text-ink-2">
          {t.footer.telegram.split('{link}')[0]}
          <a href="https://t.me/oilpalm" target="_blank" rel="noopener" className="underline hover:text-gold">@oilpalm</a>
          {t.footer.telegram.split('{link}')[1]}
        </p>
        <p className="text-ink-2">
          <a href={localePath(lang, '/analytics')} className="underline hover:text-gold">{EXTRA[lang].analytics.title}</a>
          {' · '}
          <a href={localePath(lang, '/analytics#subscribe')} className="underline hover:text-gold">{EXTRA[lang].sub.title}</a>
        </p>
        {updatedAt && <p>{fill(t.footer.updated, { time: fmtTimeUtc(updatedAt, lang) })}</p>}
        <p>{t.footer.conv}</p>
        <p>{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
