'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { Receipt, ReceiptItem } from '@/lib/types';

type Period = '1W' | '1M' | '3M' | 'YTD' | '1Y';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeDate(dateStr: string, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [, m, d] = dateStr.split('-');
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}`;
}

// ── Period utilities ──────────────────────────────────────────────────────────

function getPeriodBounds(period: Period, now: Date): { start: Date; end: Date; label: string; prevLabel: string } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === '1W') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Last 7 days', prevLabel: 'prior week' };
  }

  if (period === '1M') {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Last 30 days', prevLabel: 'prior 30 days' };
  }

  if (period === '3M') {
    const start = new Date(now);
    start.setDate(now.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Last 3 months', prevLabel: 'prior 3 months' };
  }

  if (period === 'YTD') {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      start, end,
      label: `YTD ${now.getFullYear()}`,
      prevLabel: String(now.getFullYear() - 1),
    };
  }

  // 1Y
  const start = new Date(now);
  start.setFullYear(now.getFullYear() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: 'Last 12 months', prevLabel: 'prior year' };
}

function getFilteredReceipts(receipts: Receipt[], period: Period, now: Date): Receipt[] {
  const { start } = getPeriodBounds(period, now);
  const today = now.toISOString().slice(0, 10);
  const startStr = start.toISOString().slice(0, 10);
  return receipts.filter(r => r.purchase_date >= startStr && r.purchase_date <= today);
}

function getCatData(
  receipts: Receipt[],
  items: ReceiptItem[],
  period: Period,
  now: Date,
): { category: string; total: number }[] {
  const filteredIds = new Set(getFilteredReceipts(receipts, period, now).map(r => r.id));
  const catTotals: Record<string, number> = {};
  for (const item of items) {
    if (filteredIds.has(item.receipt_id)) {
      catTotals[item.category] = (catTotals[item.category] ?? 0) + item.total_price;
    }
  }
  const sorted = Object.entries(catTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const otherEntry = sorted.find(c => c.category === 'Other');
  const named = sorted.filter(c => c.category !== 'Other');
  const top3 = named.slice(0, 3);
  const otherTotal = named.slice(3).reduce((s, c) => s + c.total, 0) + (otherEntry?.total ?? 0);
  if (otherTotal > 0) top3.push({ category: 'Other', total: otherTotal });
  return top3;
}

function getPrevSpend(receipts: Receipt[], period: Period, now: Date): number {
  const { start, end } = getPeriodBounds(period, now);
  const windowMs = end.getTime() - start.getTime();

  let prevStart: Date, prevEnd: Date;

  if (period === 'YTD') {
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else {
    prevEnd   = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - windowMs);
  }

  const s = prevStart.toISOString().slice(0, 10);
  const e = prevEnd.toISOString().slice(0, 10);
  return receipts
    .filter(r => r.purchase_date >= s && r.purchase_date <= e)
    .reduce((acc, r) => acc + r.total, 0);
}

// ── Bar-chart bucket builder ──────────────────────────────────────────────────

type Bucket = {
  label: string | null;
  start: string;
  end: string;
  isCurrent: boolean;
};

function getBuckets(period: Period, now: Date): Bucket[] {
  const todayStr = now.toISOString().slice(0, 10);

  if (period === '1W') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      return {
        label: i === 6 ? 'Today' : DAYS_SHORT[d.getDay()],
        start: dateStr,
        end: dateStr,
        isCurrent: i === 6,
      };
    });
  }

  if (period === '1M') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (29 - i));
      const dateStr = d.toISOString().slice(0, 10);
      return {
        label: i % 6 === 0 ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : null,
        start: dateStr,
        end: dateStr,
        isCurrent: i === 29,
      };
    });
  }

  if (period === '3M') {
    // 13 weekly buckets, last one ends today
    return Array.from({ length: 13 }, (_, i) => {
      const weeksBack = 12 - i;
      const wEnd = new Date(now);
      wEnd.setDate(now.getDate() - weeksBack * 7);
      const wStart = new Date(wEnd);
      wStart.setDate(wEnd.getDate() - 6);
      return {
        label: i % 4 === 0 ? `${MONTHS_SHORT[wStart.getMonth()]} ${wStart.getDate()}` : null,
        start: wStart.toISOString().slice(0, 10),
        end: i === 12 ? todayStr : wEnd.toISOString().slice(0, 10),
        isCurrent: i === 12,
      };
    });
  }

  if (period === 'YTD') {
    const cur = now.getMonth();
    return Array.from({ length: cur + 1 }, (_, m) => {
      const mStart = new Date(now.getFullYear(), m, 1);
      const mEnd   = m === cur ? now : new Date(now.getFullYear(), m + 1, 0);
      return {
        label: MONTHS_SHORT[m],
        start: mStart.toISOString().slice(0, 10),
        end: mEnd.toISOString().slice(0, 10),
        isCurrent: m === cur,
      };
    });
  }

  // 1Y — 12 monthly buckets
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd   = i === 11 ? now : new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      label: MONTHS_SHORT[d.getMonth()],
      start: mStart.toISOString().slice(0, 10),
      end: mEnd.toISOString().slice(0, 10),
      isCurrent: i === 11,
    };
  });
}

// ── Components ────────────────────────────────────────────────────────────────

const DONUT_R = 30;
const DONUT_C = 2 * Math.PI * DONUT_R;

function DonutChart({ categories, total }: { categories: { category: string; total: number }[]; total: number }) {
  let cumulative = 0;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
      <circle cx="40" cy="40" r={DONUT_R} fill="none" stroke="#E2E4EE" strokeWidth="10" />
      {categories.map(({ category, total: val }) => {
        const pct = val / total;
        const dash = pct * DONUT_C;
        const offset = -(cumulative * DONUT_C);
        cumulative += pct;
        const color = CAT_COLORS[category]?.fg ?? '#6366F1';
        return (
          <circle
            key={category}
            cx="40" cy="40" r={DONUT_R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${DONUT_C}`}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
          />
        );
      })}
    </svg>
  );
}

function BarChart({ receipts, period, now }: { receipts: Receipt[]; period: Period; now: Date }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const buckets = getBuckets(period, now);
  const amounts = buckets.map(b =>
    receipts
      .filter(r => r.purchase_date >= b.start && r.purchase_date <= b.end)
      .reduce((sum, r) => sum + r.total, 0)
  );

  const maxAmount = Math.max(...amounts, 0.01);
  const n = buckets.length;
  const gap = n > 20 ? 1.5 : n > 10 ? 2 : 3;

  // Clamp tooltip so it stays inside the card
  const tooltipPct = hoveredIdx !== null
    ? Math.max(5, Math.min(95, ((hoveredIdx + 0.5) / n) * 100))
    : 50;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 4px)',
          left: `${tooltipPct}%`,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11, fontWeight: 600, color: 'white',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          ${amounts[hoveredIdx].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}

      {/* Bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap,
          height: 72,
        }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
            onMouseEnter={() => setHoveredIdx(i)}
          >
            <div style={{
              width: '100%',
              height: `${Math.max(2, (amounts[i] / maxAmount) * 72)}px`,
              background: `rgba(255,255,255,${b.isCurrent ? 0.95 : 0.38})`,
              borderRadius: 2,
            }} />
          </div>
        ))}
      </div>

      {/* X labels */}
      <div style={{ display: 'flex', gap, marginTop: 6 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, position: 'relative', height: 12 }}>
            {b.label && (
              <span style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 9,
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 500,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                {b.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardClient({
  receipts,
  items,
}: {
  receipts: Receipt[];
  items: ReceiptItem[];
}) {
  const [period, setPeriod] = useState<Period>('1M');
  const now = new Date();

  const filtered    = getFilteredReceipts(receipts, period, now);
  const total       = filtered.reduce((s, r) => s + r.total, 0);
  const catData     = getCatData(receipts, items, period, now);
  const catTotal    = catData.reduce((s, c) => s + c.total, 0) || 1;
  const { label, prevLabel } = getPeriodBounds(period, now);
  const prevSpend   = getPrevSpend(receipts, period, now);

  let deltaText = '';
  let deltaUp   = false;
  if (prevSpend > 0) {
    const pct = Math.abs(((total - prevSpend) / prevSpend) * 100).toFixed(0);
    deltaUp   = total > prevSpend;
    deltaText = `${deltaUp ? '↑' : '↓'} ${pct}% vs ${prevLabel}`;
  }

  const recentFiltered = [...filtered]
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1))
    .slice(0, 5);

  const TINTS = [
    { fg: '#B45309', bg: '#FEF3C7' },
    { fg: '#059669', bg: '#D1FAE5' },
    { fg: '#0EA5E9', bg: '#E0F2FE' },
    { fg: '#8B5CF6', bg: '#EDE9FE' },
    { fg: '#EC4899', bg: '#FCE7F3' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1A3ACC, #2952E3)',
        borderRadius: 18, padding: '20px 22px',
      }}>
        {/* Top row: period label + pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            {label}
          </p>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.25)', borderRadius: 100, padding: '3px 4px' }}>
            {(['1W', '1M', '3M', 'YTD', '1Y'] as Period[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                  background: period === p ? 'white' : 'transparent',
                  color: period === p ? '#0D0F1A' : 'rgba(255,255,255,0.55)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Total + badge */}
        <p className="mono" style={{ color: 'white', fontSize: 40, fontWeight: 500, margin: '0 0 6px', letterSpacing: '-1px', lineHeight: 1 }}>
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {deltaText && (
            <span style={{
              background: deltaUp ? 'rgba(255,100,100,0.25)' : 'rgba(100,255,160,0.2)',
              color: deltaUp ? '#FFB3B3' : '#6EFFA8',
              fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '4px 10px',
            }}>{deltaText}</span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            {filtered.length} receipt{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bar chart */}
        <BarChart receipts={receipts} period={period} now={now} />
      </section>

      {/* ── Spending by Category ────────────────────────────────────────── */}
      <section>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Spending by Category
        </p>
        {catData.length === 0 ? (
          <div style={{
            background: '#F2F3F7', borderRadius: 14, padding: '24px 16px',
            textAlign: 'center', color: '#7B8099', fontSize: 13,
          }}>
            No spending in this period
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <DonutChart categories={catData} total={catTotal} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catData.map(({ category, total: val }) => {
                const pct = Math.round((val / catTotal) * 100);
                const color = CAT_COLORS[category]?.fg ?? '#6366F1';
                return (
                  <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#0D0F1A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {category}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: '#0D0F1A', whiteSpace: 'nowrap' }}>
                      ${val.toFixed(0)}
                    </span>
                    <span style={{ fontSize: 11, color: '#7B8099', width: 32, textAlign: 'right', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Recent Receipts ──────────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: 0, letterSpacing: '-0.02em' }}>Recent Receipts</p>
          <Link href="/receipts" style={{ fontSize: 13, color: '#2952E3', textDecoration: 'none' }}>View all →</Link>
        </div>
        {recentFiltered.length === 0 ? (
          <div style={{
            background: '#F2F3F7', borderRadius: 14, padding: '24px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#7B8099' }}>No receipts in this period</p>
            <Link href="/upload" style={{
              fontSize: 12, fontWeight: 600, color: '#2952E3', textDecoration: 'none',
              background: '#EEF2FF', borderRadius: 100, padding: '6px 14px',
            }}>Upload a receipt →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentFiltered.map((r, i) => {
              const tint = TINTS[i % TINTS.length];
              return (
                <Link key={r.id} href={`/receipts/${r.id}`} className="receipt-row" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < recentFiltered.length - 1 ? '1px solid #E2E4EE' : 'none',
                  textDecoration: 'none', color: 'inherit',
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
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.store_name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>{r.item_count} items</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="mono" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A' }}>${r.total.toFixed(2)}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>{relativeDate(r.purchase_date, now)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
