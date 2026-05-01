import { signIn } from '@/auth';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-primary)',
    }}>
      {/* Left panel — brand */}
      <div style={{
        display: 'none',
        flex: '1',
        background: 'var(--text-primary)',
        padding: '48px',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }} className="sign-in-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2h2"/>
              <path d="M9 12h6"/><path d="M9 8h6"/>
            </svg>
          </span>
          <span style={{ color: 'white', fontWeight: 500, fontSize: 16, letterSpacing: '-0.01em' }}>Ledger.AI</span>
        </div>

        <div>
          <p style={{ color: 'white', fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.3, margin: '0 0 20px' }}>
            Know exactly where<br />your money goes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '📷', text: 'Snap receipts, AI extracts everything' },
              { icon: '📊', text: 'Spending breakdown by category' },
              { icon: '✨', text: 'Ask anything about your purchases' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — auth */}
      <div style={{
        flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          {/* Logo mark — visible on mobile only */}
          <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="sign-in-mobile-logo">
            <span style={{
              width: 48, height: 48, borderRadius: 14, background: 'var(--text-primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', marginBottom: 14,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2h2"/>
                <path d="M9 12h6"/><path d="M9 8h6"/>
              </svg>
            </span>
            <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 4px' }}>Ledger.AI</p>
          </div>

          <p style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Welcome back
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
            Sign in to your account
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <form action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}>
              <SignInButton label="Continue with Google" icon={<GoogleIcon />} />
            </form>

            <form action={async () => {
              'use server';
              await signIn('apple', { redirectTo: '/' });
            }}>
              <SignInButton label="Continue with Apple" icon={<AppleIcon />} dark />
            </form>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 28, lineHeight: 1.6 }}>
            By signing in you agree to our terms of service<br />and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInButton({ label, icon, dark }: { label: string; icon: React.ReactNode; dark?: boolean }) {
  return (
    <button
      type="submit"
      style={{
        width: '100%', height: 46,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer',
        border: dark ? 'none' : '1px solid var(--border-medium)',
        background: dark ? 'var(--text-primary)' : 'var(--bg-primary)',
        color: dark ? '#ffffff' : 'var(--text-primary)',
        letterSpacing: '-0.01em',
        transition: 'opacity 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.3 268.9-317.3 72 0 132 46.9 171.6 46.9 37.9 0 107.7-49.9 191.2-49.9 30.8 0 108.2 2.6 168.9 80.8zm-192.8-60.7c-3.2-20.7-9-41.4-19.3-60 0-.6-.6-.6-.6-1.3-.6 0-.6 0-1.3 0-20.7 8.4-41.4 23.8-58.8 45.2-17.3 21.4-32.7 52.2-32.7 85.5 0 4.5 0 9 1.3 13.5 1.9.6 5.2 1.3 8.4 1.3 19.4 0 40.1-12.9 55.5-32.7 15.4-19.8 30.1-50.6 47.5-51.5z"/>
    </svg>
  );
}
