import { redirect } from 'next/navigation';
import EmptyStateCTA from '@/components/EmptyStateCTA';
import DashboardClient from '@/components/DashboardClient';
import { getAllReceipts, getAllItems } from '@/lib/db';
import { auth } from '@/auth';
import type { Receipt, ReceiptItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) redirect('/sign-in');

  let receipts: Receipt[] = [];
  let allItems: ReceiptItem[] = [];

  try {
    [receipts, allItems] = await Promise.all([getAllReceipts(userId), getAllItems(userId)]);
  } catch { /* DB not initialised */ }

  if (receipts.length === 0) {
    return <EmptyStateCTA userName={session?.user?.name ?? ''} />;
  }

  return <DashboardClient receipts={receipts} items={allItems} />;
}
