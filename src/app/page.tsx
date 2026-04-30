import Link from 'next/link';
import DashboardUpload from '@/components/DashboardUpload';
import DashboardQuery from '@/components/DashboardQuery';
import { getAllReceipts, getAllItems } from '@/lib/db';
import type { Receipt } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  Dairy: 'var(--cat-dairy)',
  Produce: 'var(--cat-produce)',
  'Meat & Seafood': 'var(--cat-meat)',
  Bakery: 'var(--cat-bakery)',
  Beverages: 'var(--cat-beverage)',
  Snacks: 'var(--cat-snack)',
  'Frozen Foods': 'var(--cat-frozen)',
  'Canned & Packaged': 'var(--cat-canned)',
  'Oils & Condiments': 'var(--cat-oils)',
  Household: 'var(--cat-household)',
  'Personal Care': 'var(--cat-personal)',
  Other: 'var(--cat-other)',
};

const TINTS = [
  { bg: 'var(--tint-purple-bg)', fg: 'var(--tint-purple-fg)' },
  { bg: 'var(--tint-coral-bg)',  fg: 'var(--tint-coral-fg)' },
  { bg: 'var(--tint-teal-bg)',   fg: 'var(--tint-teal-fg)' },
  { bg: 'var(--tint-pink-bg)',   fg: 'var(--tint-pink-fg)' },
];

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

export default async function Home() {
  let receipts: Receipt[] = [];
  let categoryTotals: Record<string, number> = {};

  try {
    const [allReceipts, allItems] = await Promise.all([getAllReceipts(), getAllItems()]);
    receipts = allReceipts;

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const thisMonthIds = new Set(
      allReceipts.filter(r => r.purchase_date.startsWith(thisMonth)).map(r => r.id)
    );
    for (const item of allItems) {
      if (thisMonthIds.has(item.receipt_id)) {
        categoryTotals[item.category] = (categoryTotals[item.category] ?? 0) + item.total_price;
      }
    }
  } catch {
    // DB not initialised yet — show empty state
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
  let deltaSuccess = false;
  if (lastMonthTotal > 0) {
    const pct = Math.abs(((totalThisMonth - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0);
    deltaSuccess = totalThisMonth <= lastMonthTotal;
    deltaText = `${deltaSuccess ? '↓' : '↑'} ${pct}% vs last month`;
  }

  const categories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxCatTotal = categories[0]?.total ?? 1;

  const recentReceipts = [...receipts]
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1))
    .slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Greeting */}
      <section>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.025em' }}>Hi Tapan</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          Snap your receipts, see exactly where your money goes.
        </p>
      </section>

      {/* Upload zone */}
      <DashboardUpload />

      {/* Query */}
      <DashboardQuery />

      {/* Metrics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {[
          {
            label: 'Spent this month',
            value: `$${totalThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            delta: deltaText,
            deltaSuccess,
          },
          {
            label: 'Receipts captured',
            value: String(receipts.length),
            delta: `${totalItemCount} line items tracked`,
            deltaSuccess: null,
          },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '16px 18px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{m.label}</p>
            <p style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
            {m.delta && (
              <p style={{
                fontSize: 12, margin: '4px 0 0',
                color: m.deltaSuccess === true ? 'var(--success-text)'
                     : m.deltaSuccess === false ? 'var(--danger-text)'
                     : 'var(--text-secondary)',
              }}>
                {m.delta}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <section style={{ border: '0.5px solid var(--border-light)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Spending by category</p>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This month</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 32px' }}>
            {categories.map(({ category, total }) => (
              <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{category}</span>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(total / maxCatTotal) * 100}%`,
                    background: CATEGORY_COLORS[category] ?? 'var(--cat-other)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent receipts */}
      {recentReceipts.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Recent receipts</p>
            <Link href="/receipts" style={{
              fontSize: 12, padding: '6px 12px',
              border: '0.5px solid var(--border-light)', borderRadius: 8,
              color: 'var(--text-secondary)', textDecoration: 'none',
              transition: 'background 0.15s',
            }}>
              View all
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentReceipts.map((r, i) => {
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
                  }}>
                    {initials(r.store_name)}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{r.store_name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {r.item_count} items
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
        </section>
      )}

      {/* Empty state */}
      {receipts.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: 8 }}>
          Upload your first receipt above to get started.
        </p>
      )}

    </div>
  );
}
