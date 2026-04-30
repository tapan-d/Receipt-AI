'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavUploadButton from './NavUploadButton';

const NAV = [
  { href: '/',          label: 'Dashboard' },
  { href: '/receipts',  label: 'Receipts' },
  { href: '/items',     label: 'Items' },
  { href: null,         label: 'Trends' },
];

export default function Navigation() {
  const pathname = usePathname();

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
              background: 'var(--text-primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2h2"/>
                <path d="M9 12h6"/><path d="M9 8h6"/>
              </svg>
            </span>
            <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              Ledger
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV.map(({ href, label }) => {
              const active = href !== null && pathname === href;
              const disabled = href === null;
              return disabled ? (
                <span key={label} style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 8,
                  color: 'var(--text-tertiary)', cursor: 'default',
                }}>
                  {label}
                </span>
              ) : (
                <Link key={label} href={href!} style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 8,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-secondary)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: upload + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <NavUploadButton />
        <button aria-label="Settings" style={{
          width: 32, height: 32, padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '0.5px solid var(--border-light)', background: 'transparent',
          borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        </div>
      </div>
    </header>
  );
}
