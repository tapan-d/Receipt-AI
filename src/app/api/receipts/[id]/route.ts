import { NextRequest, NextResponse } from 'next/server';
import { getReceiptById, getItemsByReceiptId } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipt = await getReceiptById(id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    const items = await getItemsByReceiptId(id);
    return NextResponse.json({ receipt, items });
  } catch (err) {
    console.error('Receipt detail error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
