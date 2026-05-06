'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NavUploadButton from './NavUploadButton';

const NAV = [
  { href: '/',         label: 'Dashboard' },
  { href: '/receipts', label: 'Receipts' },
  { href: '/items',    label: 'Items' },
  { href: '/trends',   label: 'Trends' },
];

export default function Navigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header style={{
      borderBottom: '0.5px solid var(--border-light)',
      marginBottom: 0,
    }}>
      <div style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
      }}>
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--accent)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2h2"/>
                <path d="M9 12h6"/><path d="M9 8h6"/>
              </svg>
            </span>
            <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              Ledger.AI
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={label} href={href} style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 8,
                  color: active ? 'var(--brand)' : 'var(--ink-3)',
                  background: active ? 'var(--brand-light)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {label}
                </Link>
              );
            })}
            {isAdmin && (() => {
              const active = pathname === '/admin';
              return (
                <Link href="/admin" style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 8,
                  color: active ? 'var(--brand)' : 'var(--ink-3)',
                  background: active ? 'var(--brand-light)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  Admin
                </Link>
              );
            })()}
          </nav>
        </div>

        {/* Right: upload + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavUploadButton />
          <Link href="/profile" aria-label="Profile" style={{
            width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '0.5px solid var(--border-light)',
            background: session?.user?.image ? 'transparent' : 'var(--bg-secondary)',
            textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
          }}>
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" width={32} height={32} style={{ display: 'block' }} />
            ) : (
              <span>{session?.user?.name?.slice(0, 1).toUpperCase() ?? '?'}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
