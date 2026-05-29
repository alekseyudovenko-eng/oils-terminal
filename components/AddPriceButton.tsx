'use client'
import { useState } from 'react';

export default function AddPriceButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch('/api/cron/daily-update', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={loading}
      className="bg-slate-900 text-white px-4 py-2 text-sm font-medium rounded-sm hover:bg-slate-800 transition disabled:opacity-50"
    >
      {loading ? 'UPDATING...' : 'UPDATE PRICES'}
    </button>
  );
}
