import { describe, it, expect } from 'vitest';
import { ExtractedReceiptSchema } from '../types';

const validReceipt = {
  is_receipt: true,
  store_name: 'Trader Joes',
  purchase_date: '2026-05-08',
  subtotal: 19.55,
  tax_amount: 1.61,
  total: 21.16,
  items: [
    { name: 'Organic Bananas', category: 'Produce', quantity: 1, unit_price: 2.49, discount: 0, total_price: 2.49 },
  ],
};

describe('ExtractedReceiptSchema', () => {
  it('parses a valid receipt', () => {
    const result = ExtractedReceiptSchema.parse(validReceipt);
    expect(result.is_receipt).toBe(true);
    expect(result.store_name).toBe('Trader Joes');
    expect(result.total).toBe(21.16);
    expect(result.items).toHaveLength(1);
  });

  it('applies defaults for missing optional fields', () => {
    const minimal = { is_receipt: true };
    const result = ExtractedReceiptSchema.parse(minimal);
    expect(result.store_name).toBe('');
    expect(result.subtotal).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.payments).toEqual([]);
    expect(result.discount_code).toBeNull();
    expect(result.tip).toBe(0);
  });

  it('strips unknown fields', () => {
    const withExtra = { ...validReceipt, injectedField: 'bad', anotherExtra: 123 };
    const result = ExtractedReceiptSchema.parse(withExtra) as Record<string, unknown>;
    expect(result['injectedField']).toBeUndefined();
    expect(result['anotherExtra']).toBeUndefined();
  });

  it('throws on invalid is_receipt type', () => {
    expect(() => ExtractedReceiptSchema.parse({ is_receipt: 'yes' })).toThrow();
    expect(() => ExtractedReceiptSchema.parse({ is_receipt: 1 })).toThrow();
  });

  it('applies item defaults for missing item fields', () => {
    const receipt = { is_receipt: true, items: [{ name: 'Milk' }] };
    const result = ExtractedReceiptSchema.parse(receipt);
    expect(result.items[0].quantity).toBe(1);
    expect(result.items[0].unit_price).toBe(0);
    expect(result.items[0].category).toBe('Other');
    expect(result.items[0].discount).toBe(0);
  });

  it('parses is_receipt: false with rejection_reason', () => {
    const rejected = { is_receipt: false, rejection_reason: 'Not a receipt' };
    const result = ExtractedReceiptSchema.parse(rejected);
    expect(result.is_receipt).toBe(false);
    expect(result.rejection_reason).toBe('Not a receipt');
  });

  it('discount_code accepts null', () => {
    const result = ExtractedReceiptSchema.parse({ is_receipt: false, discount_code: null });
    expect(result.discount_code).toBeNull();
  });

  it('parses payments array with defaults', () => {
    const receipt = {
      is_receipt: true,
      payments: [{ method: 'VISA', amount: 21.16 }],
    };
    const result = ExtractedReceiptSchema.parse(receipt);
    expect(result.payments[0].method).toBe('VISA');
    expect(result.payments[0].card_last4).toBe('');
    expect(result.payments[0].card_aid).toBe('');
  });
});
