import { NextResponse } from 'next/server';
import { getAllReceipts } from '@/lib/db';

export async function GET() {
  try {
    const receipts = await getAllReceipts();
    receipts.sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));
    return NextResponse.json(receipts);
  } catch (err) {
    console.error('Receipts list error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
