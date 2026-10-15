'use client'
import { useState } from 'react';

export default function AddPriceButton() {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setNote('');
    try {
      const res = await fetch('/api/refresh-prices', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.updated?.length) {
        window.location.reload();
        return;
      }
      setNote(data.message || 'Новых цен получить не удалось');
    } catch (e) {
      console.error(e);
      setNote('Ошибка сети');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-xs text-slate-500 max-w-xs text-right">{note}</span>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-slate-900 text-white px-4 py-2 text-sm font-medium rounded-sm hover:bg-slate-800 transition disabled:opacity-50"
      >
        {loading ? 'UPDATING...' : 'UPDATE PRICES'}
      </button>
    </div>
  );
}
