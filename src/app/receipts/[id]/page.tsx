'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Receipt, ReceiptItem } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  Dairy: 'bg-yellow-100 text-yellow-700',
  Produce: 'bg-green-100 text-green-700',
  'Meat & Seafood': 'bg-red-100 text-red-700',
  Bakery: 'bg-orange-100 text-orange-700',
  Beverages: 'bg-blue-100 text-blue-700',
  Snacks: 'bg-purple-100 text-purple-700',
  'Frozen Foods': 'bg-cyan-100 text-cyan-700',
  'Canned & Packaged': 'bg-gray-100 text-gray-700',
  'Oils & Condiments': 'bg-amber-100 text-amber-700',
  Household: 'bg-teal-100 text-teal-700',
  'Personal Care': 'bg-pink-100 text-pink-700',
  Other: 'bg-gray-100 text-gray-600',
};

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setReceipt(data.receipt); setItems(data.items); setImageUrl(data.image_url ?? null); }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!receipt) return null;

  const hasRewards = receipt.reward_card_number || receipt.reward_program_name || receipt.reward_points_current;
  const hasPayment = receipt.payment_method || receipt.card_last4;
  const imageSrc = imageUrl;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      router.push('/receipts');
    } catch (err) {
      setError(String(err));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/receipts" className="text-gray-400 hover:text-gray-600 text-sm inline-block">← Receipts</Link>
        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Delete this receipt?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#993c1d', color: 'white', cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--border-medium)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Delete
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {imageSrc && (
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Receipt"
                style={{ width: 140, borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{receipt.store_name}</h1>
            {receipt.store_address && <p className="text-sm text-gray-500 mt-0.5">{receipt.store_address}</p>}
            <div className="flex flex-wrap gap-3 mt-1">
              {receipt.store_phone && <span className="text-sm text-gray-500">📞 {receipt.store_phone}</span>}
              {receipt.store_website && <span className="text-sm text-blue-600">🌐 {receipt.store_website}</span>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900">${receipt.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
                <p className="text-sm font-semibold text-gray-900">{receipt.purchase_date}</p>
                {receipt.purchase_time && <p className="text-xs text-gray-500">{receipt.purchase_time}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Items</p>
                <p className="text-2xl font-bold text-gray-900">{receipt.item_count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Transaction */}
        <Section title="Transaction">
          <InfoRow label="Order #" value={receipt.order_number} />
          <InfoRow label="Employee" value={receipt.employee_name} />
          {receipt.store_number && <InfoRow label="Store #" value={receipt.store_number} />}
          <InfoRow label="Subtotal" value={receipt.subtotal ? `$${receipt.subtotal.toFixed(2)}` : undefined} />
          {receipt.discount > 0 && <InfoRow label="Discount" value={`-$${receipt.discount.toFixed(2)}`} />}
          {receipt.tax_rate > 0 && <InfoRow label="Tax Rate" value={`${receipt.tax_rate}%`} />}
          <InfoRow label="Tax" value={`$${receipt.tax_amount.toFixed(2)}`} />
          <InfoRow label="Total" value={`$${receipt.total.toFixed(2)}`} />
        </Section>

        <div className="space-y-4">
          {/* Payment */}
          {hasPayment && (
            <Section title="Payment">
              <InfoRow label="Method" value={receipt.payment_method} />
              <InfoRow label="Amount" value={receipt.payment_amount ? `$${receipt.payment_amount.toFixed(2)}` : undefined} />
              <InfoRow label="Card" value={receipt.card_last4 ? `•••• ${receipt.card_last4}` : undefined} />
              <InfoRow label="AID" value={receipt.card_aid} />
            </Section>
          )}

          {/* Rewards */}
          {hasRewards && (
            <Section title="Rewards">
              <InfoRow label="Program" value={receipt.reward_program_name} />
              <InfoRow label="Card" value={receipt.reward_card_number} />
              <InfoRow label="Current Points" value={receipt.reward_points_current || undefined} />
              <InfoRow label="Points Required" value={receipt.reward_points_required || undefined} />
            </Section>
          )}

          {/* POS */}
          {receipt.pos_system && (
            <Section title="System">
              <InfoRow label="POS" value={receipt.pos_system} />
            </Section>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Item</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Unit</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{item.item_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">${item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">${item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
