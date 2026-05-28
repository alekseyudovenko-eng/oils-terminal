'use client'

export default function AddPriceButton() {
  return (
    <button 
      onClick={async () => {
        // Отправляем запрос на наш API-роут
        await fetch('/api/cron/daily-update', { method: 'POST' });
        // Перезагружаем страницу, чтобы увидеть новую цену
        window.location.reload();
      }} 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold shadow-md"
    >
      ➕ Добавить тестовую цену
    </button>
  )
}
