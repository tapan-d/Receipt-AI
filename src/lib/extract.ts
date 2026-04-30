import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedReceipt } from './types';

const client = new Anthropic();

const EXTRACTION_SYSTEM = `You are a receipt parsing assistant. First determine if the image is a retail/grocery/restaurant receipt. If it is not, return {"is_receipt": false, "rejection_reason": "<brief reason>"}. If it is a receipt, extract all structured data.
Return ONLY valid JSON — no markdown, no explanation. Use empty string "" for missing text fields and 0 for missing numeric fields.`;

export async function extractReceiptFromImage(imageBase64: string, mediaType: string): Promise<ExtractedReceipt> {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 3000,
    system: [
      {
        type: 'text',
        text: EXTRACTION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `If the image is not a retail/grocery/restaurant receipt, return ONLY:
{"is_receipt": false, "rejection_reason": "<brief description of what the image actually is>"}

Otherwise extract all data and return this exact JSON structure (no other text):
{
  "is_receipt": true,
  "rejection_reason": "",
  "store_name": "string",
  "store_address": "full address as single string",
  "store_phone": "string",
  "store_website": "string",
  "store_number": "store/location number if present",
  "purchase_date": "YYYY-MM-DD",
  "purchase_time": "HH:MM in 24h format",
  "employee_name": "cashier or employee name/number",
  "order_number": "string",
  "subtotal": number,
  "discount": number,
  "tax_rate": number,
  "tax_amount": number,
  "total": number,
  "payment_method": "VISA|Mastercard|Amex|Discover|Cash|Debit|Check|Other",
  "payment_amount": number,
  "card_last4": "last 4 digits only, empty string if not present",
  "card_aid": "AID code if present",
  "reward_card_number": "masked reward card number",
  "reward_program_name": "name of reward program",
  "reward_points_current": number,
  "reward_points_required": number,
  "pos_system": "POS software/hardware brand if visible",
  "items": [
    {
      "name": "string",
      "category": "Dairy|Produce|Meat & Seafood|Bakery|Beverages|Snacks|Frozen Foods|Canned & Packaged|Oils & Condiments|Household|Personal Care|Other",
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ]
}

Rules:
- Use today's date (${new Date().toISOString().slice(0, 10)}) if date is unclear.
- Use "" for any text field not found on the receipt.
- Use 0 for any numeric field not found.
- For weighted items (e.g. "2.28 lb @ $0.99/lb"), set quantity=2.28, unit_price=0.99, total_price=quantity*unit_price.
- Do not include bag fees, rewards discounts, or non-product lines as items unless they have a real price.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonText = textBlock.text.trim();
  return JSON.parse(jsonText) as ExtractedReceipt;
}
