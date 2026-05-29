'use client'
import { useState } from 'react';

export default function AddPriceButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cron/daily-update', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Server Error');
      }
      
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <button 
        onClick={handleClick} 
        disabled={loading}
        className={`px-4 py-2 rounded font-bold shadow-md transition ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Обновление...' : '➕ Обновить цену'}
      </button>
      {error && <span className="text-red-500 text-xs mt-1 font-bold">{error}</span>}
    </div>
  );
}
