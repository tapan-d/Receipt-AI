import { NextResponse } from 'next/server';
import { getAllReceipts } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const receipts = await getAllReceipts(userId);
    receipts.sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));
    return NextResponse.json(receipts);
  } catch (err) {
    console.error('Receipts list error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
