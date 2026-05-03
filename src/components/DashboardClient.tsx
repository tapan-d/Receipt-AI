'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { Receipt, ReceiptItem } from '@/lib/types';

type Period = '1W' | '1M' | '3M' | 'YTD';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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
  if (period === '1W') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: 'Last 7 days', prevLabel: 'prior week' };
  }

  if (period === '1M') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      start, end,
      label: `${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`,
      prevLabel: MONTHS_FULL[prevDate.getMonth()],
    };
  }

  if (period === '3M') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const s = MONTHS_SHORT[start.getMonth()];
    const e = MONTHS_SHORT[now.getMonth()];
    return { start, end, label: `${s}–${e} ${now.getFullYear()}`, prevLabel: 'prior 3 months' };
  }

  // YTD
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    start, end,
    label: `YTD ${now.getFullYear()}`,
    prevLabel: String(now.getFullYear() - 1),
  };
}

function getFilteredReceipts(receipts: Receipt[], period: Period, now: Date): Receipt[] {
  const { start } = getPeriodBounds(period, now);
  const today = now.toISOString().slice(0, 10);
  const startStr = start.toISOString().slice(0, 10);
  return receipts.filter(r => r.purchase_date >= startStr && r.purchase_date <= today);
}

function getCumulativePoints(
  receipts: Receipt[],
  period: Period,
  now: Date,
): { pts: { x: number; y: number }[]; total: number } {
  const { start, end } = getPeriodBounds(period, now);
  const filtered = getFilteredReceipts(receipts, period, now);
  const totalMs = end.getTime() - start.getTime() || 1;
  const sorted = [...filtered].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let cumulative = 0;

  for (const r of sorted) {
    // Parse date at noon to avoid UTC offset issues
    const [yr, mo, dy] = r.purchase_date.split('-').map(Number);
    const d = new Date(yr, mo - 1, dy, 12, 0, 0);
    const x = Math.min(1, Math.max(0, (d.getTime() - start.getTime()) / totalMs));
    pts.push({ x, y: cumulative });
    cumulative += r.total;
    pts.push({ x, y: cumulative });
  }

  // Extend flat tail to today's position in period
  const todayX = Math.min(1, (now.getTime() - start.getTime()) / totalMs);
  pts.push({ x: todayX, y: cumulative });

  return { pts, total: cumulative };
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
  const { start } = getPeriodBounds(period, now);
  let prevStart: Date, prevEnd: Date;

  if (period === '1W') {
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
  } else if (period === '1M') {
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (period === '3M') {
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - 2, 1);
  } else {
    // YTD vs prior full year
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  }

  const s = prevStart.toISOString().slice(0, 10);
  const e = prevEnd.toISOString().slice(0, 10);
  return receipts.filter(r => r.purchase_date >= s && r.purchase_date <= e).reduce((acc, r) => acc + r.total, 0);
}

function getXAxisLabels(period: Period, now: Date): string[] {
  if (period === '1W') return ['6d ago', '4d ago', '2d ago', 'Today'];

  if (period === '1M') {
    const m = MONTHS_SHORT[now.getMonth()];
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return [`${m} 1`, `${m} 8`, `${m} 15`, `${m} 22`, `${m} ${last}`];
  }

  if (period === '3M') {
    return [-2, -1, 0].map(offset => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return MONTHS_SHORT[d.getMonth()];
    });
  }

  // YTD
  return ['Jan', 'Mar', 'May'];
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

function StepChart({
  pts,
  total,
  period,
  now,
}: {
  pts: { x: number; y: number }[];
  total: number;
  period: Period;
  now: Date;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverRel, setHoverRel] = useState<number | null>(null);

  const W = 300, H = 80;

  const svgPts = pts.map(p => ({
    sx: p.x * W,
    sy: total > 0 ? H - (p.y / total) * H : H,
    y: p.y,
  }));

  const linePath = svgPts.length > 1
    ? svgPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(' ')
    : `M 0 ${H} L ${W} ${H}`;

  const areaPath = svgPts.length > 1
    ? `${linePath} L ${svgPts[svgPts.length - 1].sx.toFixed(1)} ${H} L 0 ${H} Z`
    : '';

  function getValueAtX(relX: number): number {
    let y = 0;
    for (const p of pts) {
      if (p.x <= relX) y = p.y;
      else break;
    }
    return y;
  }

  function handlePointer(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverRel(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }

  const hoverValue = hoverRel !== null ? getValueAtX(hoverRel) : null;
  const hoverSvgX = hoverRel !== null ? hoverRel * W : null;
  const hoverSvgY = (hoverRel !== null && hoverValue !== null && total > 0)
    ? H - (hoverValue / total) * H : H;

  const tooltipPct = hoverRel !== null ? Math.max(5, Math.min(95, hoverRel * 100)) : null;
  const axisLabels = getXAxisLabels(period, now);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', userSelect: 'none', touchAction: 'none' }}
      onMouseMove={e => handlePointer(e.clientX)}
      onMouseLeave={() => setHoverRel(null)}
      onTouchMove={e => handlePointer(e.touches[0].clientX)}
      onTouchEnd={() => setHoverRel(null)}
    >
      {/* Tooltip */}
      {tooltipPct !== null && hoverValue !== null && (
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
          ${hoverValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}

      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: 'block', cursor: hoverRel !== null ? 'crosshair' : 'default' }}
      >
        <defs>
          <linearGradient id="stepFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#stepFill)" />}
        <path d={linePath} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinejoin="round" />
        {hoverSvgX !== null && (
          <>
            <line
              x1={hoverSvgX} y1={0} x2={hoverSvgX} y2={H}
              stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 2"
            />
            <circle cx={hoverSvgX} cy={hoverSvgY} r="2.5" fill="white" />
          </>
        )}
      </svg>

      {/* X-axis ghost labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {axisLabels.map(label => (
          <span key={label} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 500, lineHeight: 1 }}>
            {label}
          </span>
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

  const filtered = getFilteredReceipts(receipts, period, now);
  const { pts, total } = getCumulativePoints(receipts, period, now);
  const catData = getCatData(receipts, items, period, now);
  const catTotal = catData.reduce((s, c) => s + c.total, 0) || 1;
  const { label, prevLabel } = getPeriodBounds(period, now);
  const prevSpend = getPrevSpend(receipts, period, now);

  let deltaText = '';
  let deltaUp = false;
  if (prevSpend > 0) {
    const pct = Math.abs(((total - prevSpend) / prevSpend) * 100).toFixed(0);
    deltaUp = total > prevSpend;
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
            {(['1W', '1M', '3M', 'YTD'] as Period[]).map(p => (
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

        {/* Step-function chart */}
        <StepChart pts={pts} total={total} period={period} now={now} />
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
