import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { getReceiptById, getItemsByReceiptId, deleteReceipt } from '@/lib/db';

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipt = await getReceiptById(id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    await deleteReceipt(id);
    if (receipt.image_path) {
      const filePath = path.join(process.cwd(), 'public', receipt.image_path);
      await unlink(filePath).catch(() => {}); // ignore if already gone
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
