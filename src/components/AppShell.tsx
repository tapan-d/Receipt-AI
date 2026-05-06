'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import FloatingBar from './FloatingBar';

const AUTH_ROUTES = ['/sign-in'];

export default function AppShell({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.includes(pathname);

  return (
    <>
      {!isAuth && <Navigation isAdmin={isAdmin} />}
      <main style={isAuth ? {} : { maxWidth: 880, margin: '0 auto', padding: '24px 28px 96px' }}>
        {children}
      </main>
      {!isAuth && <FloatingBar />}
    </>
  );
}
