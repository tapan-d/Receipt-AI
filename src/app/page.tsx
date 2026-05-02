import Link from 'next/link';
import { redirect } from 'next/navigation';
import EmptyStateCTA from '@/components/EmptyStateCTA';
import { getAllReceipts, getAllItems } from '@/lib/db';
import { auth } from '@/auth';
import type { Receipt, ReceiptItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [, m, d] = dateStr.split('-');
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}`;
}

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

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) redirect('/sign-in');

  let receipts: Receipt[] = [];
  let allItems: ReceiptItem[] = [];
  let categoryTotals: Record<string, number> = {};

  try {
    [receipts, allItems] = await Promise.all([getAllReceipts(userId), getAllItems(userId)]);
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const thisMonthIds = new Set(receipts.filter(r => r.purchase_date.startsWith(thisMonth)).map(r => r.id));
    for (const item of allItems) {
      if (thisMonthIds.has(item.receipt_id)) {
        categoryTotals[item.category] = (categoryTotals[item.category] ?? 0) + item.total_price;
      }
    }
  } catch { /* DB not initialised */ }

  if (receipts.length === 0) {
    return <EmptyStateCTA userName={session?.user?.name ?? ''} />;
  }

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const thisMonthReceipts = receipts.filter(r => r.purchase_date.startsWith(thisMonth));
  const lastMonthTotal    = receipts.filter(r => r.purchase_date.startsWith(lastMonth)).reduce((s, r) => s + r.total, 0);
  const totalThisMonth    = thisMonthReceipts.reduce((s, r) => s + r.total, 0);
  const totalItemCount    = receipts.reduce((s, r) => s + r.item_count, 0);

  let deltaText = '';
  let deltaUp = false;
  if (lastMonthTotal > 0) {
    const pct = Math.abs(((totalThisMonth - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0);
    deltaUp = totalThisMonth > lastMonthTotal;
    deltaText = `${deltaUp ? '↑' : '↓'} ${pct}% vs ${MONTHS_FULL[lastMonthDate.getMonth()]}`;
  }

  const categories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const categoryGrandTotal = categories.reduce((s, c) => s + c.total, 0) || 1;

  const recentReceipts = [...receipts]
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1))
    .slice(0, 5);

  // Last 7 months for bar chart
  const months7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return {
      key: d.toISOString().slice(0, 7),
      label: MONTHS_SHORT[d.getMonth()],
      isCurrent: d.toISOString().slice(0, 7) === thisMonth,
    };
  });
  const monthlyData = months7.map(m => ({
    ...m,
    total: receipts.filter(r => r.purchase_date.startsWith(m.key)).reduce((s, r) => s + r.total, 0),
  }));
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  const periodLabel = `${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {['This Week', periodLabel, 'Last Month', 'This Year'].map(p => {
          const active = p === periodLabel;
          return (
            <button key={p} type="button" style={{
              padding: '6px 14px', borderRadius: 100, border: 'none', whiteSpace: 'nowrap',
              fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
              background: active ? '#0D0F1A' : '#F2F3F7',
              color: active ? 'white' : '#7B8099',
              transition: 'background 0.15s',
            }}>{p}</button>
          );
        })}
      </div>

      {/* Hero spend card */}
      <section style={{
        background: 'linear-gradient(135deg, #1A3ACC, #2952E3)',
        borderRadius: 18, padding: '20px 22px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          Spent this month
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <p className="mono" style={{ color: 'white', fontSize: 40, fontWeight: 500, margin: 0, letterSpacing: '-1px', lineHeight: 1 }}>
            ${totalThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {deltaText && (
            <span style={{
              background: deltaUp ? 'rgba(255,100,100,0.25)' : 'rgba(100,255,160,0.2)',
              color: deltaUp ? '#FFB3B3' : '#6EFFA8',
              fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '4px 10px',
            }}>{deltaText}</span>
          )}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 14px' }}>
          {thisMonthReceipts.length} receipts · {totalItemCount} items
        </p>

        {/* Sparkline */}
        <svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none" style={{ display: 'block' }}>
          {monthlyData.map(({ total, isCurrent }, i) => {
            const slot = 300 / 7;
            const h = maxMonthly > 0 ? Math.max((total / maxMonthly) * 32, total > 0 ? 3 : 0) : 0;
            return (
              <rect
                key={i}
                x={i * slot + slot * 0.12}
                y={40 - h}
                width={slot * 0.76}
                height={h}
                rx={3}
                fill={isCurrent ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)'}
              />
            );
          })}
        </svg>
      </section>

      {/* Spending by Category */}
      {categories.length > 0 && (
        <section>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Spending by Category
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <DonutChart categories={categories} total={categoryGrandTotal} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categories.map(({ category, total }) => {
                const pct = Math.round((total / categoryGrandTotal) * 100);
                const color = CAT_COLORS[category]?.fg ?? '#6366F1';
                return (
                  <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#0D0F1A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {category}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: '#0D0F1A', whiteSpace: 'nowrap' }}>
                      ${total.toFixed(0)}
                    </span>
                    <span style={{ fontSize: 11, color: '#7B8099', width: 32, textAlign: 'right', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Monthly History */}
      <section>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Monthly History
        </p>
        <div style={{
          background: '#F2F3F7', borderRadius: 16, padding: '16px 16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72 }}>
            {monthlyData.map(({ label, total, isCurrent }, i) => {
              const h = maxMonthly > 0 ? Math.max((total / maxMonthly) * 52, total > 0 ? 4 : 0) : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', height: h || 3,
                    background: isCurrent ? '#2952E3' : '#CACDD9',
                    borderRadius: '4px 4px 0 0',
                    opacity: h === 0 ? 0.3 : 1,
                  }} />
                  <span style={{ fontSize: 9, color: '#7B8099' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Receipts */}
      {recentReceipts.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: 0, letterSpacing: '-0.02em' }}>Recent Receipts</p>
            <Link href="/receipts" style={{ fontSize: 13, color: '#2952E3', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentReceipts.map((r, i) => {
              const tints = [
                { fg: '#B45309', bg: '#FEF3C7' },
                { fg: '#059669', bg: '#D1FAE5' },
                { fg: '#0EA5E9', bg: '#E0F2FE' },
                { fg: '#8B5CF6', bg: '#EDE9FE' },
                { fg: '#EC4899', bg: '#FCE7F3' },
              ];
              const tint = tints[i % tints.length];
              return (
                <Link key={r.id} href={`/receipts/${r.id}`} className="receipt-row" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < recentReceipts.length - 1 ? '1px solid #E2E4EE' : 'none',
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
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>{r.item_count} items</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="mono" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A' }}>${r.total.toFixed(2)}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7B8099' }}>{relativeDate(r.purchase_date)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
