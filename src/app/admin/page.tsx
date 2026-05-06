import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllowedEmails } from '@/lib/db';
import { addEmailAction, removeEmailAction } from './actions';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'access', label: 'Access Control' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const ADMIN_EMAILS =
    process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];

  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect('/');
  }

  const { tab } = await searchParams;
  const activeTab: TabId = (tab as TabId) ?? 'access';

  const emails = await getAllowedEmails();

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0D0F1A', letterSpacing: '-0.02em' }}>
          Admin
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7B8099' }}>
          Manage application settings
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E4EE' }}>
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <a
              key={t.id}
              href={`/admin?tab=${t.id}`}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#2952E3' : '#7B8099',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #2952E3' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </a>
          );
        })}
      </div>

      {/* Tab: Access Control */}
      {activeTab === 'access' && <AccessControlTab emails={emails} />}

    </div>
  );
}

function AccessControlTab({ emails }: { emails: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Add email */}
      <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 14, padding: 16 }}>
        <p style={{
          margin: '0 0 12px', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7B8099',
        }}>
          Add email
        </p>
        <form action={addEmailAction} style={{ display: 'flex', gap: 8 }}>
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            required
            autoComplete="off"
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 10,
              border: '1.5px solid #E2E4EE', fontSize: 14,
              fontFamily: 'inherit', color: '#0D0F1A', outline: 'none',
              background: 'white',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '9px 18px', borderRadius: 10,
              background: '#2952E3', color: 'white',
              border: 'none', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Email list */}
      <div style={{ background: 'white', border: '1.5px solid #E2E4EE', borderRadius: 14 }}>
        <p style={{
          margin: 0, padding: '14px 16px 10px',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#7B8099',
          borderBottom: '1px solid #E2E4EE',
        }}>
          Allowed emails {emails.length > 0 && `(${emails.length})`}
        </p>

        {emails.length === 0 ? (
          <p style={{ margin: 0, padding: '20px 16px', fontSize: 14, color: '#7B8099', textAlign: 'center' }}>
            No entries — all users can sign in
          </p>
        ) : (
          emails.map((email, i) => (
            <div
              key={email}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '11px 16px',
                borderBottom: i < emails.length - 1 ? '1px solid #E2E4EE' : 'none',
              }}
            >
              <span style={{ flex: 1, fontSize: 14, color: '#0D0F1A', fontFamily: 'var(--font-mono, monospace)' }}>
                {email}
              </span>
              <form action={removeEmailAction}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: 'transparent', border: '1.5px solid #E2E4EE',
                    fontSize: 12, color: '#7B8099', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Remove
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {/* Info note */}
      <p style={{ margin: 0, fontSize: 12, color: '#B4B8CC', textAlign: 'center' }}>
        When list is empty, all authenticated users can sign in.
      </p>

    </div>
  );
}
