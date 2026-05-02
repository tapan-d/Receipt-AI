import { NextRequest, NextResponse } from 'next/server';
import { getReceiptById, getItemsByReceiptId, deleteReceipt } from '@/lib/db';
import { getPresignedImageUrl, deleteFromR2 } from '@/lib/r2';
import { requireAuth } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { id } = await params;
    const receipt = await getReceiptById(id, userId);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    const [items, image_url] = await Promise.all([
      getItemsByReceiptId(id),
      receipt.image_path ? getPresignedImageUrl(receipt.image_path) : Promise.resolve(null),
    ]);
    return NextResponse.json({ receipt, items, image_url });
  } catch (err) {
    console.error('Receipt detail error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { id } = await params;
    const receipt = await getReceiptById(id, userId);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    await deleteReceipt(id);
    if (receipt.image_path) {
      await deleteFromR2(receipt.image_path).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
