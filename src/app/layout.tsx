import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Ledger',
  description: 'Snap your receipts, see exactly where your money goes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main style={{ maxWidth: 880, margin: '0 auto', padding: '24px 28px 64px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
