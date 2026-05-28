'use client'

export default function AddPriceButton() {
  return (
    <button 
      onClick={async () => {
        await fetch('/api/add-price', { method: 'POST' });
        window.location.reload();
      }} 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
    >
      ➕ Добавить тестовую цену
    </button>
  )
}