import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { extractReceiptFromImage } from '@/lib/extract';
import { embedTexts, buildItemEmbedText } from '@/lib/embed';
import { saveReceipt, getAllReceipts } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { requireAuth } from '@/lib/session';
import { sanitizeReceiptField } from '@/lib/promptSecurity';
import { checkRateLimit, UPLOAD_LIMIT } from '@/lib/rateLimit';
import { detectMimeFromBuffer } from '@/lib/mimeDetect';
import type { Receipt, ReceiptItem } from '@/lib/types';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const rl = checkRateLimit(`upload:${userId}`, UPLOAD_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Upload limit reached. You can upload up to 20 receipts per day.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF image.' },
        { status: 415 }
      );
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Image too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` },
        { status: 413 }
      );
    }

    const imageBase64 = buffer.toString('base64');
    const mediaType = detectedMime;

    const extracted = await extractReceiptFromImage(imageBase64, mediaType);

    if (!extracted.is_receipt) {
      return NextResponse.json(
        { error: extracted.rejection_reason || 'Image does not appear to be a receipt.' },
        { status: 422 }
      );
    }

    const existing = await getAllReceipts(userId);
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
    const ext = file.name.split('.').pop() || 'jpg';
    const imageKey = `receipts/${receiptId}.${ext}`;
    await uploadToR2(imageKey, buffer, mediaType);

    const now = new Date().toISOString();

    const embedTextsInput = extracted.items.map(item =>
      buildItemEmbedText(extracted.store_name, extracted.purchase_date, item.name, item.category, item.unit_price)
    );

    const vectors = extracted.items.length > 0 ? await embedTexts(embedTextsInput) : [];

    const receipt: Receipt = {
      id: receiptId,
      user_id: userId,
      store_name: sanitizeReceiptField(extracted.store_name),
      store_address: sanitizeReceiptField(extracted.store_address),
      store_phone: sanitizeReceiptField(extracted.store_phone, 30),
      store_website: sanitizeReceiptField(extracted.store_website, 100),
      store_number: sanitizeReceiptField(extracted.store_number, 50),
      purchase_date: extracted.purchase_date,
      purchase_time: extracted.purchase_time,
      employee_name: sanitizeReceiptField(extracted.employee_name, 100),
      order_number: sanitizeReceiptField(extracted.order_number, 50),
      subtotal: extracted.subtotal,
      discount: extracted.discount,
      tax_rate: extracted.tax_rate,
      tax_amount: extracted.tax_amount,
      total: extracted.total,
      payment_method: sanitizeReceiptField(extracted.payment_method, 50),
      payment_amount: extracted.payment_amount,
      card_last4: extracted.card_last4,
      card_aid: extracted.card_aid,
      payments: extracted.payments,
      reward_card_number: extracted.reward_card_number,
      reward_program_name: sanitizeReceiptField(extracted.reward_program_name, 100),
      reward_points_current: extracted.reward_points_current,
      reward_points_required: extracted.reward_points_required,
      discount_code: extracted.discount_code ?? null,
      tip: extracted.tip,
      gratuity: extracted.gratuity,
      pos_system: sanitizeReceiptField(extracted.pos_system, 100),
      image_path: imageKey,
      item_count: extracted.items.length,
      created_at: now,
    };

    const items: ReceiptItem[] = extracted.items.map((item, i) => ({
      id: randomUUID(),
      receipt_id: receiptId,
      user_id: userId,
      store_name: sanitizeReceiptField(extracted.store_name),
      purchase_date: extracted.purchase_date,
      item_name: sanitizeReceiptField(item.name),
      category: sanitizeReceiptField(item.category, 50),
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      total_price: item.total_price,
      vector: vectors[i] ?? [],
    }));

    await saveReceipt(receipt, items);

    return NextResponse.json({ id: receiptId, receipt });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
