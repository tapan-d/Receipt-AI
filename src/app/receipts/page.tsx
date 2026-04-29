'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Receipt } from '@/lib/types';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/receipts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReceipts(data);
        else setError(data.error || 'Failed to load receipts');
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading receipts...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🧾</div>
        <h2 className="text-xl font-semibold text-gray-700">No receipts yet</h2>
        <p className="text-gray-500 mt-2">
          <Link href="/upload" className="text-blue-600 hover:underline">Upload a receipt</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Receipts</h1>
        <Link href="/upload" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Upload
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {receipts.map(r => (
          <Link
            key={r.id}
            href={`/receipts/${r.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{r.store_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{r.purchase_date}</p>
              </div>
              <p className="text-lg font-bold text-gray-800">${r.total.toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-400 mt-3">{r.item_count} items</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
