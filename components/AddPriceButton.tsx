'use client'

export default function AddPriceButton() {
  return (
    <button 
      onClick={async () => {
        console.log('Кнопка нажата! Начинаем добавление...'); // Это для проверки
        try {
          const res = await fetch('/api/cron/daily-update', { method: 'POST' });
          console.log('Ответ от сервера:', await res.json());
          window.location.reload();
        } catch (e) {
          console.error('Ошибка:', e);
        }
      }} 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold shadow-md"
    >
      ➕ Добавить тестовую цену
    </button>
  )
}
