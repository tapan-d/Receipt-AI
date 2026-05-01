'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Receipt } from '@/lib/types';

const TINTS = [
  { bg: 'var(--tint-blue-bg)',   fg: 'var(--tint-blue-fg)' },
  { bg: 'var(--tint-coral-bg)',  fg: 'var(--tint-coral-fg)' },
  { bg: 'var(--tint-green-bg)',  fg: 'var(--tint-green-fg)' },
  { bg: 'var(--tint-purple-bg)', fg: 'var(--tint-purple-fg)' },
];

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  return isThisYear
    ? `${months[parseInt(m) - 1]} ${parseInt(d)}`
    : `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

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
    return <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</p>;
  }

  if (error) {
    return <p style={{ fontSize: 14, color: 'var(--danger-text)' }}>{error}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <section>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.025em' }}>Receipts</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          {receipts.length > 0 ? `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}` : 'No receipts yet'}
        </p>
      </section>

      {receipts.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: 32 }}>
          Upload your first receipt to get started.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {receipts.map((r, i) => {
            const tint = TINTS[i % 4];
            return (
              <Link key={r.id} href={`/receipts/${r.id}`} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto auto',
                gap: 14, alignItems: 'center', padding: '12px 14px',
                background: 'var(--bg-primary)',
                border: '0.5px solid var(--border-light)', borderRadius: 8,
                textDecoration: 'none', color: 'inherit',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500,
                  background: tint.bg, color: tint.fg,
                  flexShrink: 0,
                }}>
                  {initials(r.store_name)}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{r.store_name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {r.item_count} item{r.item_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{relativeDate(r.purchase_date)}</span>
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  ${r.total.toFixed(2)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
