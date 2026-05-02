import { signIn } from '@/auth';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #1A3ACC 0%, #2952E3 60%, #3D6BF5 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Hero panel */}
      <div style={{ flex: 1, padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2h2"/>
              <path d="M9 12h6"/><path d="M9 8h6"/>
            </svg>
          </span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>Ledger.AI</span>
        </div>

        {/* App preview card */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '16px 18px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>May 2026</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <p className="mono" style={{ color: 'white', fontSize: 28, fontWeight: 500, letterSpacing: '-1px', margin: 0 }}>$96.47</p>
            <span style={{
              background: 'rgba(255,100,100,0.25)',
              color: '#FFB3B3',
              fontSize: 11, fontWeight: 600,
              borderRadius: 100,
              padding: '3px 8px',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              ↑ 47% vs April
            </span>
          </div>

          {/* Mini sparkline */}
          <svg width="100%" height="36" viewBox="0 0 200 36" preserveAspectRatio="none" style={{ display: 'block', marginBottom: 10 }}>
            {[22, 14, 32, 18, 28, 12, 36].map((h, i) => {
              const slot = 200 / 7;
              return (
                <rect
                  key={i}
                  x={i * slot + slot * 0.12}
                  y={36 - h}
                  width={slot * 0.76}
                  height={h}
                  rx={3}
                  fill={i === 6 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}
                />
              );
            })}
          </svg>

          {/* Category bars */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Dining',   dot: '#FFD23F' },
              { label: 'Produce',  dot: '#34D399' },
              { label: 'Services', dot: '#A78BFA' },
            ].map(({ label, dot }) => (
              <div key={label} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '7px 8px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: dot, marginBottom: 5 }} />
                <span style={{ color: 'white', fontSize: 10, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tagline + features */}
        <div>
          <p style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 20px', lineHeight: 1.3 }}>
            Know exactly where your money goes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { title: 'Snap receipts instantly', sub: 'AI extracts every item automatically' },
              { title: 'Spending by category', sub: 'See exactly where your money goes' },
              { title: 'Ask anything', sub: 'Chat with AI about your purchases' },
            ].map(({ title, sub }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.7)',
                  flexShrink: 0, marginTop: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="9" height="9" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div>
                  <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: 0 }}>{title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom form panel */}
      <div style={{
        background: 'white',
        borderRadius: '22px 22px 0 0',
        padding: '16px 24px 36px',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: '#E2E4EE', borderRadius: 2,
          margin: '0 auto 18px',
        }} />

        <p style={{ fontSize: 20, fontWeight: 700, color: '#0D0F1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Welcome back
        </p>
        <p style={{ fontSize: 13, color: '#7B8099', margin: '0 0 20px' }}>
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

        <p style={{ fontSize: 11, color: '#B4B8CC', textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
          By signing in you agree to our{' '}
          <a href="#" style={{ color: '#2952E3', textDecoration: 'none' }}>terms of service</a>
          {' '}and{' '}
          <a href="#" style={{ color: '#2952E3', textDecoration: 'none' }}>privacy policy</a>.
        </p>

        <p style={{ fontSize: 12, textAlign: 'center', marginTop: 12, color: '#3D4154' }}>
          New to Ledger.AI?{' '}
          <a href="#" style={{ color: '#2952E3', fontWeight: 600, textDecoration: 'none' }}>Create account</a>
        </p>
      </div>
    </div>
  );
}

function SignInButton({ label, icon, dark }: { label: string; icon: React.ReactNode; dark?: boolean }) {
  return (
    <button
      type="submit"
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, fontSize: 14, fontWeight: 600,
        borderRadius: 12, cursor: 'pointer',
        padding: '12px 16px',
        border: dark ? 'none' : '1.5px solid #E2E4EE',
        background: dark ? '#0D0F1A' : 'white',
        color: dark ? '#ffffff' : '#0D0F1A',
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
