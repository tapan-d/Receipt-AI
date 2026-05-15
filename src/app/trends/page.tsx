import { redirect } from 'next/navigation';
import { getAllReceipts, getAllItems } from '@/lib/db';
import { auth } from '@/auth';
import type { Receipt, ReceiptItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

export default async function TrendsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/sign-in');

  let receipts: Receipt[] = [];
  let allItems: ReceiptItem[] = [];

  try {
    [receipts, allItems] = await Promise.all([getAllReceipts(userId), getAllItems(userId)]);
  } catch { /* DB not initialised */ }

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);

  // 7 months
  const months7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return {
      key: d.toISOString().slice(0, 7),
      label: MONTHS_SHORT[d.getMonth()],
      isCurrent: d.toISOString().slice(0, 7) === thisMonth,
    };
  });

  const monthlyTotals = months7.map(m => ({
    ...m,
    total: receipts.filter(r => r.purchase_date.startsWith(m.key)).reduce((s, r) => s + r.total, 0),
  }));
  const maxMonthly = Math.max(...monthlyTotals.map(m => m.total), 1);
  const nonZero = monthlyTotals.filter(m => m.total > 0);
  const avgMonthly = nonZero.length ? nonZero.reduce((s, m) => s + m.total, 0) / nonZero.length : 0;
  const highestMonth = monthlyTotals.reduce((best, m) => m.total > best.total ? m : best, monthlyTotals[0]);

  // Category trends (per month)
  const catSet = new Set<string>();
  allItems.forEach(i => catSet.add(i.category));
  const topCats = Array.from(catSet)
    .map(cat => ({
      cat,
      thisMonthTotal: allItems.filter(i => i.category === cat && i.purchase_date.startsWith(thisMonth)).reduce((s, i) => s + i.total_price, 0),
      perMonth: months7.map(m => ({
        ...m,
        total: allItems.filter(i => i.category === cat && i.purchase_date.startsWith(m.key)).reduce((s, i) => s + i.total_price, 0),
      })),
    }))
    .filter(c => c.thisMonthTotal > 0)
    .sort((a, b) => b.thisMonthTotal - a.thisMonthTotal)
    .slice(0, 5);

  // AI Insights (computed)
  const thisMonthTotal = receipts.filter(r => r.purchase_date.startsWith(thisMonth)).reduce((s, r) => s + r.total, 0);
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const lastMonthTotal = receipts.filter(r => r.purchase_date.startsWith(lastMonthKey)).reduce((s, r) => s + r.total, 0);
  const topCatName = topCats[0]?.cat ?? null;
  const topCatAmt = topCats[0]?.thisMonthTotal ?? 0;
  const totalItemsThisMonth = allItems.filter(i => i.purchase_date.startsWith(thisMonth)).length;

  const insights: { type: 'red' | 'green' | 'amber'; text: string }[] = [];
  if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal) {
    const pct = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    insights.push({ type: 'red', text: `Spending up ${pct}% vs last month — $${thisMonthTotal.toFixed(0)} vs $${lastMonthTotal.toFixed(0)}.` });
  } else if (lastMonthTotal > 0 && thisMonthTotal < lastMonthTotal) {
    const pct = Math.round(((lastMonthTotal - thisMonthTotal) / lastMonthTotal) * 100);
    insights.push({ type: 'green', text: `Spending down ${pct}% vs last month — you saved $${(lastMonthTotal - thisMonthTotal).toFixed(0)}.` });
  }
  if (topCatName) {
    const pct = thisMonthTotal > 0 ? Math.round((topCatAmt / thisMonthTotal) * 100) : 0;
    insights.push({ type: 'amber', text: `${topCatName} is your top category this month at $${topCatAmt.toFixed(0)} (${pct}% of total).` });
  }
  if (totalItemsThisMonth > 0) {
    insights.push({ type: 'green', text: `${totalItemsThisMonth} items tracked this month across ${receipts.filter(r => r.purchase_date.startsWith(thisMonth)).length} receipts.` });
  }
  // Pad to 3 if needed
  while (insights.length < 3) {
    insights.push({ type: 'amber', text: 'Upload more receipts to unlock deeper spending insights.' });
  }

  const insightColors = {
    red:   { bg: 'var(--red-bg)',   icon: 'var(--red)',   stroke: 'var(--red)' },
    green: { bg: 'var(--green-bg)', icon: 'var(--green)', stroke: 'var(--green)' },
    amber: { bg: 'var(--amber-bg)', icon: 'var(--amber)', stroke: 'var(--amber)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.02em', color: '#0D0F1A' }}>Trends</h1>
        <p style={{ fontSize: 12, color: '#7B8099', margin: 0 }}>Past 7 months</p>
      </div>

      {/* Monthly Spending chart */}
      <section style={{ background: '#F2F3F7', borderRadius: 16, padding: '18px 18px 14px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0D0F1A', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Monthly Spending</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 12 }}>
          {monthlyTotals.map(({ label, total, isCurrent }, i) => {
            const h = maxMonthly > 0 ? Math.max((total / maxMonthly) * 60, total > 0 ? 4 : 0) : 0;
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

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid #E2E4EE' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#7B8099', margin: '0 0 2px' }}>Average / month</p>
            <p className="mono" style={{ fontSize: 16, fontWeight: 500, color: '#0D0F1A', margin: 0 }}>
              ${avgMonthly.toFixed(0)}
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#7B8099', margin: '0 0 2px' }}>Highest month</p>
            <p className="mono" style={{ fontSize: 16, fontWeight: 500, color: '#0D0F1A', margin: 0 }}>
              ${highestMonth?.total.toFixed(0) ?? '0'}
              <span style={{ fontSize: 10, fontFamily: 'inherit', color: '#7B8099', marginLeft: 4 }}>{highestMonth?.label}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Category Trends */}
      {topCats.length > 0 && (
        <section>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: '0 0 14px', letterSpacing: '-0.02em' }}>Category Trends</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topCats.map(({ cat, thisMonthTotal: catTotal, perMonth }) => {
              const colors = CAT_COLORS[cat] ?? CAT_COLORS.Other;
              const catMax = Math.max(...perMonth.map(m => m.total), 1);
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28, width: 140, flexShrink: 0 }}>
                    {perMonth.map(({ total, isCurrent }, i) => {
                      const h = catMax > 0 ? Math.max((total / catMax) * 22, total > 0 ? 2 : 0) : 0;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{
                            width: '100%', height: h || 2,
                            background: colors.fg,
                            borderRadius: '2px 2px 0 0',
                            opacity: isCurrent ? 1 : 0.25,
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: colors.fg, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0D0F1A' }}>{cat}</span>
                    </div>
                    <p className="mono" style={{ margin: '2px 0 0', fontSize: 12, color: '#7B8099' }}>
                      ${catTotal.toFixed(0)} this month
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI Insights */}
      <section>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#0D0F1A', margin: '0 0 14px', letterSpacing: '-0.02em' }}>AI Insights</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.slice(0, 3).map((insight, i) => {
            const c = insightColors[insight.type];
            return (
              <div key={i} style={{
                background: c.bg, borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: c.icon, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {insight.type === 'red' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  )}
                  {insight.type === 'green' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                  )}
                  {insight.type === 'amber' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: '#0D0F1A', lineHeight: 1.5 }}>{insight.text}</p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
