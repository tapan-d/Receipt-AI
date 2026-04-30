import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { extractReceiptFromImage } from '@/lib/extract';
import { embedTexts, buildItemEmbedText } from '@/lib/embed';
import { saveReceipt, getAllReceipts } from '@/lib/db';
import type { Receipt, ReceiptItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageBase64 = buffer.toString('base64');
    const mediaType = file.type || 'image/jpeg';

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${randomUUID()}.${ext}`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', fileName);
    await writeFile(uploadPath, buffer);

    const extracted = await extractReceiptFromImage(imageBase64, mediaType);

    if (!extracted.is_receipt) {
      return NextResponse.json(
        { error: extracted.rejection_reason || 'Image does not appear to be a receipt.' },
        { status: 422 }
      );
    }

    const existing = await getAllReceipts();
    const duplicate = existing.find(
      r => r.store_name.trim().toLowerCase() === extracted.store_name.trim().toLowerCase() &&
           r.purchase_date === extracted.purchase_date &&
           Math.abs(r.total - extracted.total) < 0.01
    );
    if (duplicate) {
      return NextResponse.json(
        { error: 'This receipt has already been uploaded.', duplicate: true, id: duplicate.id },
        { status: 409 }
      );
    }

    const receiptId = randomUUID();
    const now = new Date().toISOString();

    const embedTextsInput = extracted.items.map(item =>
      buildItemEmbedText(extracted.store_name, extracted.purchase_date, item.name, item.category, item.unit_price)
    );

    const vectors = extracted.items.length > 0 ? await embedTexts(embedTextsInput) : [];

    const receipt: Receipt = {
      id: receiptId,
      store_name: extracted.store_name,
      store_address: extracted.store_address,
      store_phone: extracted.store_phone,
      store_website: extracted.store_website,
      store_number: extracted.store_number,
      purchase_date: extracted.purchase_date,
      purchase_time: extracted.purchase_time,
      employee_name: extracted.employee_name,
      order_number: extracted.order_number,
      subtotal: extracted.subtotal,
      discount: extracted.discount,
      tax_rate: extracted.tax_rate,
      tax_amount: extracted.tax_amount,
      total: extracted.total,
      payment_method: extracted.payment_method,
      payment_amount: extracted.payment_amount,
      card_last4: extracted.card_last4,
      card_aid: extracted.card_aid,
      reward_card_number: extracted.reward_card_number,
      reward_program_name: extracted.reward_program_name,
      reward_points_current: extracted.reward_points_current,
      reward_points_required: extracted.reward_points_required,
      pos_system: extracted.pos_system,
      image_path: `/api/uploads/${fileName}`,
      item_count: extracted.items.length,
      created_at: now,
    };

    const items: ReceiptItem[] = extracted.items.map((item, i) => ({
      id: randomUUID(),
      receipt_id: receiptId,
      store_name: extracted.store_name,
      purchase_date: extracted.purchase_date,
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      vector: vectors[i] ?? [],
    }));

    await saveReceipt(receipt, items);

    return NextResponse.json({ id: receiptId, receipt });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
