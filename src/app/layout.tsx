import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Providers from '@/components/Providers';
import AppShell from '@/components/AppShell';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Ledger.AI',
  description: 'Snap your receipts, see exactly where your money goes.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];
  const isAdmin = !!session?.user?.email && adminEmails.includes(session.user.email);

  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell isAdmin={isAdmin}>{children}</AppShell>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
