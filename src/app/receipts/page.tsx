'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Receipt } from '@/lib/types';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TINTS = [
  { fg: '#B45309', bg: '#FEF3C7' },
  { fg: '#059669', bg: '#D1FAE5' },
  { fg: '#0EA5E9', bg: '#E0F2FE' },
  { fg: '#8B5CF6', bg: '#EDE9FE' },
  { fg: '#EC4899', bg: '#FCE7F3' },
];

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function groupLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  const months = MONTHS_SHORT;
  const isThisYear = parseInt(y) === new Date().getFullYear();
  return isThisYear
    ? `${months[parseInt(m) - 1]} ${parseInt(d)}`
    : `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

type SortKey = 'date' | 'amount' | 'name';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q ? receipts.filter(r => r.store_name.toLowerCase().includes(q)) : [...receipts];
    if (sort === 'date')   list.sort((a, b) => a.purchase_date < b.purchase_date ? 1 : -1);
    if (sort === 'amount') list.sort((a, b) => b.total - a.total);
    if (sort === 'name')   list.sort((a, b) => a.store_name.localeCompare(b.store_name));
    return list;
  }, [receipts, search, sort]);

  const totalSpend = receipts.reduce((s, r) => s + r.total, 0);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Receipt[]>();
    for (const r of filtered) {
      const g = map.get(r.purchase_date) ?? [];
      g.push(r);
      map.set(r.purchase_date, g);
    }
    return Array.from(map.entries()).map(([date, rows]) => ({ date, rows }));
  }, [filtered]);

  if (loading) return <p style={{ fontSize: 14, color: '#7B8099' }}>Loading…</p>;
  if (error)   return <p style={{ fontSize: 14, color: 'var(--red)' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.02em', color: '#0D0F1A' }}>Receipts</h1>
          <p style={{ fontSize: 12, color: '#7B8099', margin: 0 }}>
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · ${totalSpend.toFixed(2)} total
          </p>
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          style={{
            fontSize: 13, color: '#3D4154', background: 'white',
            border: '1.5px solid #E2E4EE', borderRadius: 10, padding: '6px 10px',
            outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="date">Date</option>
          <option value="amount">Amount</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Search */}
      {receipts.length > 0 && (
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: '#7B8099', display: 'flex',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search receipts…"
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              fontSize: 14, fontFamily: 'inherit',
              color: '#0D0F1A', background: '#F2F3F7',
              border: '1.5px solid transparent', borderRadius: 10,
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#2952E3'}
            onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: '#7B8099', textAlign: 'center', paddingTop: 32 }}>
          {receipts.length === 0 ? 'Upload your first receipt to get started.' : 'No receipts match your search.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map(({ date, rows }) => (
            <div key={date}>
              {/* Date group label */}
              <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#7B8099', margin: '0 0 8px',
              }}>
                {groupLabel(date)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rows.map((r, i) => {
                  const tint = TINTS[i % TINTS.length];
                  return (
                    <Link key={r.id} href={`/receipts/${r.id}`} className="receipt-row" style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 12px',
                      background: 'white',
                      borderRadius: i === 0 && i === rows.length - 1 ? 12
                        : i === 0 ? '12px 12px 0 0'
                        : i === rows.length - 1 ? '0 0 12px 12px' : 0,
                      borderBottom: i < rows.length - 1 ? '1px solid #E2E4EE' : 'none',
                      textDecoration: 'none', color: 'inherit',
                      transition: 'background 0.15s',
                    }}>
                      <span style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                        background: tint.bg, color: tint.fg,
                      }}>
                        {initials(r.store_name)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.store_name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>{r.item_count} item{r.item_count !== 1 ? 's' : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <p className="mono" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A' }}>${r.total.toFixed(2)}</p>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B8CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
