import { NextRequest, NextResponse } from 'next/server';
import { getReceiptById, getItemsByReceiptId, deleteReceipt } from '@/lib/db';
import { getPresignedImageUrl, deleteFromR2 } from '@/lib/r2';
import { requireAuth } from '@/lib/session';
import { log, logError } from '@/lib/log';

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
      log(`receipt GET: id=${id} not found`);
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    const [items, image_url] = await Promise.all([
      getItemsByReceiptId(id),
      receipt.image_path ? getPresignedImageUrl(receipt.image_path) : Promise.resolve(null),
    ]);
    log(`receipt GET: id=${id} items=${items.length} image=${!!image_url}`);
    return NextResponse.json({ receipt, items, image_url });
  } catch (err) {
    logError('receipt GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      log(`receipt DELETE: id=${id} not found`);
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    await deleteReceipt(id);
    if (receipt.image_path) {
      await deleteFromR2(receipt.image_path).catch(() => {});
    }
    log(`receipt DELETE: id=${id} image_path=${receipt.image_path}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError('receipt DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
