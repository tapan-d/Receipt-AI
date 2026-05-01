'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import UploadFAB from './UploadFAB';

const AUTH_ROUTES = ['/sign-in'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.includes(pathname);

  return (
    <>
      {!isAuth && <Navigation />}
      <main style={isAuth ? {} : { maxWidth: 880, margin: '0 auto', padding: '24px 28px 96px' }}>
        {children}
      </main>
      {!isAuth && <UploadFAB />}
    </>
  );
}
