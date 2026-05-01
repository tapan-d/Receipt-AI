import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllReceipts } from '@/lib/db';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  let receiptCount = 0;
  try {
    const receipts = await getAllReceipts(session.user.email!);
    receiptCount = receipts.length;
  } catch {
    // DB not initialised yet
  }

  const { name, email, image } = session.user;
  const initials = name?.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
        Profile
      </p>

      {/* User card */}
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '24px',
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
      }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={56} height={56} style={{ borderRadius: '50%', flexShrink: 0 }} />
        ) : (
          <span style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--text-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18, fontWeight: 500, flexShrink: 0,
          }}>
            {initials}
          </span>
        )}
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{email}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px', marginBottom: 24,
        display: 'flex', gap: 32,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{receiptCount}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Receipts</p>
        </div>
      </div>

      {/* Sign out */}
      <form action={async () => {
        'use server';
        await signOut({ redirectTo: '/sign-in' });
      }}>
        <button type="submit" style={{
          height: 42, padding: '0 20px',
          fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--border-medium)', background: 'transparent',
          color: 'var(--danger-text)', letterSpacing: '-0.01em',
        }}>
          Sign out
        </button>
      </form>
    </div>
  );
}
