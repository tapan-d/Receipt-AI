import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import sharp from 'sharp';
import { extractReceiptFromImage } from '@/lib/extract';
import { embedTexts, buildItemEmbedText } from '@/lib/embed';
import { saveReceipt, findDuplicateReceipt, findReceiptByHash } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { requireAuth } from '@/lib/session';
import { sanitizeReceiptField } from '@/lib/promptSecurity';
import { checkRateLimit, UPLOAD_LIMIT } from '@/lib/rateLimit';
import { detectMimeFromBuffer } from '@/lib/mimeDetect';
import type { Receipt, ReceiptItem } from '@/lib/types';
import { log, logWarn, logError } from '@/lib/log';

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

    log(`upload: file="${file.name}" size=${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    const imageHash = createHash('sha256').update(buffer).digest('hex');
    const hashDuplicate = await findReceiptByHash(userId, imageHash);
    if (hashDuplicate) {
      log(`hash-dupe: matched existing receipt id=${hashDuplicate.id}`);
      return NextResponse.json(
        { error: 'This receipt has already been uploaded.', duplicate: true, id: hashDuplicate.id },
        { status: 409 }
      );
    }

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

    // Compress for Anthropic if needed — client targets 1.5 MB but server catches anything that slips through
    const UPLOAD_SIZE_LIMIT = 1.5 * 1024 * 1024;
    let apiBuffer: Buffer = buffer as Buffer;
    let apiMediaType: string = detectedMime;

    if (buffer.length > UPLOAD_SIZE_LIMIT) {
      log(`sharp: input ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit, compressing...`);
      const passes: Array<{ width: number; quality: number }> = [
        { width: 1600, quality: 82 },
        { width: 1200, quality: 72 },
        { width: 900,  quality: 60 },
        { width: 700,  quality: 50 },
      ];
      for (const { width, quality } of passes) {
        const compressed = await sharp(buffer)
          .rotate()  // auto-rotate based on EXIF orientation, then strips the tag
          .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality })
          .toBuffer();
        log(`sharp: tried ${width}px@q${quality} → ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
        if (compressed.length <= UPLOAD_SIZE_LIMIT) {
          apiBuffer = compressed;
          apiMediaType = 'image/jpeg';
          log(`sharp: accepted ${width}px@q${quality}, ratio=${((1 - compressed.length / buffer.length) * 100).toFixed(0)}% reduction`);
          break;
        }
        // last pass: use smallest regardless
        if (width === 700) {
          apiBuffer = compressed;
          apiMediaType = 'image/jpeg';
          logWarn(`sharp: all passes exhausted, using best-effort ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    } else {
      // Even if no resize needed, run rotate + re-encode to bake in EXIF orientation and strip the tag.
      // Otherwise raw landscape pixels with EXIF=6 reach Claude/R2 with no rotation applied.
      const normalized = await sharp(buffer)
        .rotate()
        .jpeg({ quality: 90 })
        .toBuffer();
      apiBuffer = normalized;
      apiMediaType = 'image/jpeg';
      log(`sharp: normalized orientation (${(buffer.length / 1024).toFixed(0)}KB → ${(normalized.length / 1024).toFixed(0)}KB)`);
    }

    const imageBase64 = apiBuffer.toString('base64');
    const mediaType = apiMediaType;

    log(`extract: sending ${(apiBuffer.length / 1024 / 1024).toFixed(2)}MB to Claude (${apiMediaType})`);
    const extracted = await extractReceiptFromImage(imageBase64, mediaType);

    if (!extracted.is_receipt) {
      logWarn(`extract: rejected — ${extracted.rejection_reason}`);
      return NextResponse.json(
        { error: extracted.rejection_reason || 'Image does not appear to be a receipt.' },
        { status: 422 }
      );
    }

    log(`extract: store="${extracted.store_name}" date=${extracted.purchase_date} total=$${extracted.total} items=${extracted.items.length}`);

    const duplicate = await findDuplicateReceipt(userId, extracted.store_name, extracted.purchase_date, extracted.total);
    if (duplicate) {
      logWarn(`duplicate: matched existing receipt id=${duplicate.id}`);
      return NextResponse.json(
        { error: 'This receipt has already been uploaded.', duplicate: true, id: duplicate.id },
        { status: 409 }
      );
    }

    const receiptId = randomUUID();
    const ext = apiMediaType === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg');
    const imageKey = `receipts/${receiptId}.${ext}`;
    const now = new Date().toISOString();

    const embedTextsInput = extracted.items.map(item =>
      buildItemEmbedText(extracted.store_name, extracted.purchase_date, item.name, item.category, item.unit_price)
    );

    const [, vectors] = await Promise.all([
      uploadToR2(imageKey, apiBuffer, apiMediaType),
      extracted.items.length > 0 ? embedTexts(embedTextsInput) : Promise.resolve([]),
    ]);
    log(`r2: uploaded ${(apiBuffer.length / 1024 / 1024).toFixed(2)}MB as ${imageKey}`);

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
      image_hash: imageHash,
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

    log(`saved: receipt id=${receiptId} items=${items.length}`);
    return NextResponse.json({ id: receiptId, receipt });
  } catch (err) {
    logError('upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
