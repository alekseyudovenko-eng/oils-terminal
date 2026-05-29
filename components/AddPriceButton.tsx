'use client'

export default function AddPriceButton() {
  return (
    <button 
      onClick={async () => {
        try {
          await fetch('/api/cron/daily-update', { method: 'POST' });
          window.location.reload();
        } catch (e) {
          console.error('Error:', e);
        }
      }} 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold shadow-md"
    >
      ➕ Обновить цену
    </button>
  )
}
