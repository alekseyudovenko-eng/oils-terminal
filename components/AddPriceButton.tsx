'use client'

export default function AddPriceButton() {
  return (
    <button 
      onClick={async () => {
        console.log('Кнопка нажата!');
        try {
          const res = await fetch('/api/cron/daily-update', { method: 'POST' });
          const data = await res.json();
          console.log('УСПЕХ! Ответ сервера:', data);
          alert('Цена добавлена! Сейчас обновим страницу...');
          window.location.reload();
        } catch (e) {
          console.error('ОШИБКА:', e);
          alert('Произошла ошибка. Смотри консоль.');
        }
      }} 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold shadow-md"
    >
      ➕ Добавить тестовую цену
    </button>
  )
}
