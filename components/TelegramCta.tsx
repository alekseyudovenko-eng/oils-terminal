// components/TelegramCta.tsx — заметный блок «Подписаться на @oilpalm» сразу после котировок. Ссылка с UTM (utm_medium=cta).
import type { Locale } from '@/lib/i18n';
import { tgUrl } from '@/lib/links';

const TEXT: Record<string, { title: string; text: string; btn: string }> = {
  ru: { title: 'Цены на пальмовое масло — каждое утро в Telegram', text: 'IMA Daily Snapshot, дайджест новостей и опрос недели в канале @oilpalm.', btn: 'Подписаться на @oilpalm' },
  en: { title: 'Palm oil prices every morning on Telegram', text: 'IMA Daily Snapshot, news digest and a weekly poll in the @oilpalm channel.', btn: 'Subscribe to @oilpalm' },
  uz: { title: 'Palma moyi narxlari har kuni ertalab Telegramda', text: 'IMA Daily Snapshot, yangiliklar va haftalik soʻrov @oilpalm kanalida.', btn: '@oilpalm ga obuna boʻlish' },
  kk: { title: 'Пальма майының бағасы — күн сайын таңертең Telegram-да', text: 'IMA Daily Snapshot, жаңалықтар мен апталық сауалнама @oilpalm арнасында.', btn: '@oilpalm арнасына жазылу' },
  ms: { title: 'Harga minyak sawit setiap pagi di Telegram', text: 'IMA Daily Snapshot, ringkasan berita dan tinjauan mingguan di saluran @oilpalm.', btn: 'Langgan @oilpalm' },
};

export default function TelegramCta({ lang }: { lang: Locale }) {
  const c = TEXT[lang] ?? TEXT.en;
  return (
    <aside aria-label="Telegram" className="mx-auto max-w-page w-full px-4 sm:px-6 mt-6">
      <div className="rounded-lg border border-gold/50 bg-panel p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="font-cond text-lg font-semibold leading-snug">{c.title}</p>
          <p className="text-sm text-ink-2 mt-1">{c.text}</p>
        </div>
        <a href={tgUrl('cta', 'after_quotes')} target="_blank" rel="noopener"
          className="mt-3 sm:mt-0 inline-block whitespace-nowrap rounded-sm bg-gold px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          {c.btn}
        </a>
      </div>
    </aside>
  );
}
