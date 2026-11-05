import { fmtTimeUtc } from '@/lib/format';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';

export default function SiteFooter({ updatedAt }: { updatedAt: string }) {
  const { lang, t } = getDict();
  return (
    <footer className="mt-auto border-t border-rule bg-panel text-xs text-ink-3">
      <div className="mx-auto max-w-page px-4 sm:px-6 py-5 grid gap-1">
        <p className="text-ink-2">
          {t.footer.telegram.split('{link}')[0]}
          <a href="https://t.me/oilpalm" target="_blank" rel="noopener" className="underline hover:text-gold">@oilpalm</a>
          {t.footer.telegram.split('{link}')[1]}
        </p>
        <p>{fill(t.footer.updated, { time: fmtTimeUtc(updatedAt, lang) })}</p>
        <p>{t.footer.conv}</p>
        <p>{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
