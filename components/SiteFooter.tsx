import { fmtTimeUtc } from '@/lib/format';

export default function SiteFooter({ updatedAt }: { updatedAt: string }) {
  return (
    <footer className="mt-auto border-t border-rule bg-panel text-xs text-ink-3">
      <div className="mx-auto max-w-page px-4 sm:px-6 py-5 grid gap-1">
        <p>Страница обновлена {fmtTimeUtc(updatedAt)}. Котировки фьючерсов идут с задержкой 10–15 минут; данные TradingView.</p>
        <p>Пересчёт в доллары за тонну — по текущему курсу. Балансы — USDA FAS PSD; региональные оценки — USDA GAIN, Eurostat и национальная статистика.</p>
        <p>Информация справочная и не является инвестиционной рекомендацией.</p>
      </div>
    </footer>
  );
}
