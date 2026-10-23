import { fmtTimeUtc } from '@/lib/format';
import { getDict } from '@/lib/i18n-server';
import { fill } from '@/lib/dict';

export default function SiteFooter({ updatedAt }: { updatedAt: string }) {
  const { lang, t } = getDict();
  return (
    <footer className="mt-auto border-t border-rule bg-panel text-xs text-ink-3">
      <div className="mx-auto max-w-page px-4 sm:px-6 py-5 grid gap-1">
        <p>{fill(t.footer.updated, { time: fmtTimeUtc(updatedAt, lang) })}</p>
        <p>{t.footer.conv}</p>
        <p>{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
