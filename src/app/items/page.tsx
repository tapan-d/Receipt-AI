'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ReceiptItem } from '@/lib/types';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CAT_COLORS: Record<string, { fg: string; bg: string }> = {
  Produce:             { fg: '#059669', bg: '#D1FAE5' },
  Bakery:              { fg: '#B45309', bg: '#FEF3C7' },
  'Frozen Foods':      { fg: '#0EA5E9', bg: '#E0F2FE' },
  Snacks:              { fg: '#EC4899', bg: '#FCE7F3' },
  Services:            { fg: '#8B5CF6', bg: '#EDE9FE' },
  Dining:              { fg: '#EF4444', bg: '#FEE2E2' },
  Shopping:            { fg: '#EF4444', bg: '#FEE2E2' },
  Dairy:               { fg: '#0EA5E9', bg: '#E0F2FE' },
  'Meat & Seafood':    { fg: '#EF4444', bg: '#FEE2E2' },
  Beverages:           { fg: '#2952E3', bg: '#EEF2FF' },
  'Canned & Packaged': { fg: '#7B8099', bg: '#F2F3F7' },
  'Oils & Condiments': { fg: '#B45309', bg: '#FEF3C7' },
  Household:           { fg: '#8B5CF6', bg: '#EDE9FE' },
  'Personal Care':     { fg: '#EC4899', bg: '#FCE7F3' },
  Other:               { fg: '#6366F1', bg: '#EEF2FF' },
};

function catInitial(category: string) {
  return category.trim()[0]?.toUpperCase() ?? '?';
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  const isThisYear = parseInt(y) === new Date().getFullYear();
  return isThisYear
    ? `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}`
    : `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems([...data].sort((a, b) => a.purchase_date < b.purchase_date ? 1 : -1));
        } else {
          setError(data.error || 'Failed to load items');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    items.forEach(item => seen.add(item.category));
    return ['All', ...Array.from(seen).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      const matchSearch = !q || item.item_name.toLowerCase().includes(q) || item.store_name.toLowerCase().includes(q);
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [items, search, activeCategory]);

  const filteredTotal = useMemo(() => filtered.reduce((s, i) => s + i.total_price, 0), [filtered]);

  if (loading) return <p style={{ fontSize: 14, color: '#7B8099' }}>Loading…</p>;
  if (error)   return <p style={{ fontSize: 14, color: 'var(--red)' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.02em', color: '#0D0F1A' }}>Items</h1>
        <p style={{ fontSize: 12, color: '#7B8099', margin: 0 }}>
          {items.length > 0
            ? `${filtered.length.toLocaleString()} of ${items.length.toLocaleString()} items · $${filteredTotal.toFixed(2)}`
            : 'No items yet'}
        </p>
      </div>

      {items.length > 0 && (
        <>
          {/* Search */}
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
              placeholder="Search items or stores…"
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

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {categories.map(cat => {
              const active = cat === activeCategory;
              const colors = cat !== 'All' ? (CAT_COLORS[cat] ?? CAT_COLORS.Other) : null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    padding: '5px 12px', borderRadius: 100,
                    border: active ? 'none' : '1.5px solid #E2E4EE',
                    background: active ? (colors ? colors.bg : '#0D0F1A') : 'white',
                    color: active ? (colors ? colors.fg : 'white') : '#7B8099',
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: '#7B8099', textAlign: 'center', paddingTop: 32 }}>
          {items.length === 0 ? 'Upload receipts to see your items here.' : 'No items match your search.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((item, i) => {
            const colors = CAT_COLORS[item.category] ?? CAT_COLORS.Other;
            return (
              <Link key={item.id} href={`/receipts/${item.receipt_id}`} className="receipt-row" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px',
                background: 'white',
                borderRadius: i === 0 && i === filtered.length - 1 ? 12
                  : i === 0 ? '12px 12px 0 0'
                  : i === filtered.length - 1 ? '0 0 12px 12px' : 0,
                borderBottom: i < filtered.length - 1 ? '1px solid #E2E4EE' : 'none',
                textDecoration: 'none', color: 'inherit',
                transition: 'background 0.15s',
              }}>
                <span style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600,
                  background: colors.bg, color: colors.fg,
                }}>
                  {catInitial(item.category)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {toTitleCase(item.item_name)}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>
                    {item.store_name} · {relativeDate(item.purchase_date)}
                  </p>
                </div>
                <p className="mono" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', flexShrink: 0 }}>
                  ${item.total_price.toFixed(2)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
