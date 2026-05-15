import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllReceipts, getAllItems } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const { name, email } = session.user;
  const initials = name?.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  let receiptCount = 0;
  let itemCount = 0;
  let thisMonthTotal = 0;

  try {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const [receipts, items] = await Promise.all([getAllReceipts(session.user.id), getAllItems(session.user.id)]);
    receiptCount = receipts.length;
    itemCount = items.length;
    thisMonthTotal = receipts.filter(r => r.purchase_date.startsWith(thisMonth)).reduce((s, r) => s + r.total, 0);
  } catch { /* DB not initialised */ }

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Profile header card */}
      <div style={{
        background: 'linear-gradient(135deg, #1A3ACC, #2952E3)',
        borderRadius: 18, padding: '24px 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 20, fontWeight: 700,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>{name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{email}</p>
          </div>
        </div>

        {/* 3 stat tiles */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Receipts', value: receiptCount },
            { label: 'Items', value: itemCount },
            { label: 'This month', value: `$${thisMonthTotal.toFixed(0)}`, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{
              flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px',
            }}>
              <p className={mono ? 'mono' : undefined} style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 500, color: 'white' }}>
                {value}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: 0, padding: '14px 16px 10px', borderBottom: '1px solid #E2E4EE' }}>
          Settings
        </p>
        {[
          { icon: '🔔', label: 'Notifications', sub: 'Spending alerts and updates', toggle: true },
          { icon: '💱', label: 'Default Currency', sub: 'USD — US Dollar', chevron: true },
          { icon: '📤', label: 'Export Data', sub: 'Download your receipts as CSV', chevron: true },
          { icon: '🛡', label: 'Privacy & Data', sub: 'Manage your data', chevron: true },
        ].map(({ icon, label, sub, toggle, chevron }, i, arr) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid #E2E4EE' : 'none',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: '#F2F3F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#0D0F1A' }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#7B8099' }}>{sub}</p>
            </div>
            {toggle && (
              <div style={{
                width: 36, height: 20, borderRadius: 100, background: '#2952E3',
                position: 'relative', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', right: 2, top: 2,
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                }} />
              </div>
            )}
            {chevron && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B8CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* About */}
      <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099', margin: 0, padding: '14px 16px 10px', borderBottom: '1px solid #E2E4EE' }}>
          About
        </p>
        {[
          { label: 'App Version', value: '1.0.0' },
          { label: 'Send Feedback', chevron: true },
          { label: 'Rate the App', chevron: true },
        ].map(({ label, value, chevron }, i, arr) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid #E2E4EE' : 'none',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#0D0F1A', flex: 1 }}>{label}</span>
            {value && <span style={{ fontSize: 14, color: '#7B8099' }}>{value}</span>}
            {chevron && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B4B8CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Sign out — neutral, not red */}
      <form action={async () => {
        'use server';
        await signOut({ redirectTo: '/sign-in' });
      }}>
        <button type="submit" style={{
          width: '100%', padding: '13px',
          fontSize: 14, fontWeight: 500, borderRadius: 13, cursor: 'pointer',
          border: '1.5px solid #E2E4EE', background: 'white',
          color: '#7B8099', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'border-color 0.15s, color 0.15s',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </form>

    </div>
  );
}
