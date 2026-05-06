import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { embedText } from '@/lib/embed';
import { searchItemsByVector, getReceiptsByIds } from '@/lib/db';
import { requireAuth } from '@/lib/session';

const client = new Anthropic();

const QUERY_SYSTEM = `You are a personal receipt analysis assistant. You have access to the user's purchase history.
You are given two sections of data:
1. RECEIPT SUMMARIES — one line per receipt with store-level totals, tax, discounts, and payment.
2. ITEMS — individual line items with category and price.

Use both sections to answer questions accurately. Do calculations when needed.
Be concise and helpful. Format currency as USD. If the data is insufficient, say so clearly.`;

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const { question } = await request.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 });
    }

    const queryVector = await embedText(question);
    const items = await searchItemsByVector(queryVector, 100, userId);

    if (items.length === 0) {
      return NextResponse.json({ answer: 'No receipt data found. Please upload some receipts first.' });
    }

    const uniqueReceiptIds = [...new Set(items.map(i => i.receipt_id))];
    const receipts = await getReceiptsByIds(uniqueReceiptIds, userId);
    const receiptMap = new Map(receipts.map(r => [r.id, r]));

    const receiptSummaries = receipts.map(r => {
      const parts = [
        `${r.purchase_date}${r.purchase_time ? ' ' + r.purchase_time : ''}`,
        r.store_name,
        `subtotal: $${r.subtotal.toFixed(2)}`,
        r.discount > 0 ? `discount: -$${r.discount.toFixed(2)}` : null,
        r.tax_rate > 0 ? `tax_rate: ${r.tax_rate}%` : 'tax_rate: 0%',
        `tax: $${r.tax_amount.toFixed(2)}`,
        `total: $${r.total.toFixed(2)}`,
        r.payment_method ? `payment: ${r.payment_method}${r.card_last4 ? ' ****' + r.card_last4 : ''}` : null,
      ].filter(Boolean);
      return parts.join(' | ');
    });

    const itemsContext = items.map(item => {
      const r = receiptMap.get(item.receipt_id);
      const store = r?.store_name ?? item.store_name;
      return `${item.purchase_date} | ${store} | ${item.item_name} | ${item.category} | qty: ${item.quantity} | unit: $${item.unit_price.toFixed(2)} | total: $${item.total_price.toFixed(2)}`;
    });

    const context = [
      'RECEIPT SUMMARIES (store totals, tax, discounts, payment):',
      ...receiptSummaries,
      '',
      'ITEMS (individual line items):',
      ...itemsContext,
    ].join('\n');

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: QUERY_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Here is my purchase data:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const answer = textBlock?.type === 'text' ? textBlock.text : 'No response generated.';

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Query error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
