'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ReceiptItem } from '@/lib/types';

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  Dairy:               { bg: 'rgba(83,74,183,0.12)',   fg: '#534ab7' },
  Produce:             { bg: 'rgba(29,158,117,0.12)',  fg: '#1d9e75' },
  'Meat & Seafood':    { bg: 'rgba(216,90,48,0.12)',   fg: '#d85a30' },
  Bakery:              { bg: 'rgba(224,120,56,0.12)',   fg: '#e07838' },
  Beverages:           { bg: 'rgba(59,130,246,0.12)',   fg: '#3b82f6' },
  Snacks:              { bg: 'rgba(147,51,234,0.12)',   fg: '#9333ea' },
  'Frozen Foods':      { bg: 'rgba(6,182,212,0.12)',    fg: '#06b6d4' },
  'Canned & Packaged': { bg: 'rgba(136,135,128,0.12)', fg: '#888780' },
  'Oils & Condiments': { bg: 'rgba(217,119,6,0.12)',   fg: '#d97706' },
  Household:           { bg: 'rgba(100,116,139,0.12)', fg: '#64748b' },
  'Personal Care':     { bg: 'rgba(212,83,126,0.12)',  fg: '#d4537e' },
  Other:               { bg: 'rgba(180,178,169,0.12)', fg: '#888780' },
};

function catInitial(category: string) {
  return category.trim()[0]?.toUpperCase() ?? '?';
}

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const isThisYear = parseInt(y) === new Date().getFullYear();
  return isThisYear
    ? `${months[parseInt(m) - 1]} ${parseInt(d)}`
    : `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
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
          const sorted = [...data].sort((a, b) =>
            a.purchase_date < b.purchase_date ? 1 : -1
          );
          setItems(sorted);
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
      const matchesSearch = !q || item.item_name.toLowerCase().includes(q) || item.store_name.toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  if (loading) {
    return <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</p>;
  }

  if (error) {
    return <p style={{ fontSize: 14, color: 'var(--danger-text)' }}>{error}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <section>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.025em' }}>Items</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          {items.length > 0
            ? `${filtered.length.toLocaleString()} of ${items.length.toLocaleString()} item${items.length !== 1 ? 's' : ''}`
            : 'No items yet'}
        </p>
      </section>

      {items.length > 0 && (
        <>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none', color: 'var(--text-tertiary)', display: 'flex',
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
                width: '100%', padding: '10px 12px 10px 36px',
                fontSize: 14, fontFamily: 'inherit',
                color: 'var(--text-primary)', background: 'var(--bg-secondary)',
                border: '0.5px solid var(--border-medium)', borderRadius: 8,
                outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const active = cat === activeCategory;
              const colors = cat !== 'All' ? CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other : null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontSize: 12, padding: '5px 11px',
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    border: active
                      ? `0.5px solid ${colors ? colors.fg : 'var(--text-primary)'}`
                      : '0.5px solid var(--border-medium)',
                    background: active
                      ? (colors ? colors.bg : 'var(--bg-tertiary)')
                      : 'var(--bg-secondary)',
                    color: active
                      ? (colors ? colors.fg : 'var(--text-primary)')
                      : 'var(--text-secondary)',
                    fontWeight: active ? 500 : 400,
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
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: 32 }}>
          {items.length === 0
            ? 'Upload receipts to see your items here.'
            : 'No items match your search.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(item => {
            const colors = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other;
            return (
              <Link key={item.id} href={`/receipts/${item.receipt_id}`} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto auto',
                gap: 14, alignItems: 'center', padding: '12px 14px',
                background: 'var(--bg-primary)',
                border: '0.5px solid var(--border-light)', borderRadius: 8,
                textDecoration: 'none', color: 'inherit',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                  background: colors.bg, color: colors.fg,
                }}>
                  {catInitial(item.category)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.item_name}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {item.store_name}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {relativeDate(item.purchase_date)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  ${item.total_price.toFixed(2)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
