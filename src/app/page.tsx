import Link from 'next/link';
import { redirect } from 'next/navigation';
import DashboardUpload from '@/components/DashboardUpload';
import { getAllReceipts, getAllItems } from '@/lib/db';
import { auth } from '@/auth';
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
  const [, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EYEBROW: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)',
  margin: 0,
};

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) redirect('/sign-in');

  let receipts: Receipt[] = [];
  let categoryTotals: Record<string, number> = {};

  try {
    const [allReceipts, allItems] = await Promise.all([getAllReceipts(userId), getAllItems(userId)]);
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
    // DB not initialised yet
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (receipts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 36 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <DashboardUpload />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ ...EYEBROW, marginBottom: 14 }}>What you&apos;ll see</p>
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              'Spending breakdown by category',
              'Monthly totals and trends',
              'AI-powered spending queries',
            ].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Data view ─────────────────────────────────────────────────────────────
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
    deltaText = `${deltaSuccess ? '↓' : '↑'} ${pct}% vs ${MONTHS[lastMonthDate.getMonth()]}`;
  }

  const categories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxCatTotal = categories[0]?.total ?? 1;
  const categoryGrandTotal = categories.reduce((s, c) => s + c.total, 0) || 1;

  const recentReceipts = [...receipts]
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1))
    .slice(0, 4);

  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Hero metric */}
      <section>
        <p style={{ ...EYEBROW, marginBottom: 12 }}>{monthLabel}</p>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '20px 22px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Spent this month</p>
          <p style={{ fontSize: 42, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            ${totalThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          {deltaText && (
            <span style={{
              display: 'inline-block', marginTop: 8,
              fontSize: 12, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
              background: deltaSuccess ? 'rgba(15,110,86,0.1)' : 'rgba(153,60,29,0.1)',
              color: deltaSuccess ? 'var(--success-text)' : 'var(--danger-text)',
            }}>
              {deltaText}
            </span>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '10px 0 0' }}>
            {receipts.length} receipts · {totalItemCount} items tracked
          </p>
        </div>
      </section>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <section>
          <p style={{ ...EYEBROW, marginBottom: 14 }}>Spending by category</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categories.map(({ category, total }) => {
              const pct = Math.round((total / categoryGrandTotal) * 100);
              return (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>{category}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${total.toFixed(0)}
                      <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${(total / maxCatTotal) * 100}%`,
                      background: CATEGORY_COLORS[category] ?? 'var(--cat-other)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent receipts */}
      {recentReceipts.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={EYEBROW}>Recent receipts</p>
            <Link href="/receipts" style={{
              fontSize: 12, color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentReceipts.map((r, i) => {
              const tint = TINTS[i % 4];
              return (
                <Link key={r.id} href={`/receipts/${r.id}`} className="receipt-row" style={{
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

    </div>
  );
}
