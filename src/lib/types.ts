import { z } from 'zod';

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  user_id: string;
  store_name: string;
  purchase_date: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  vector: number[];
}

export interface PaymentMethod {
  method: string;
  amount: number;
  card_last4: string;
  card_aid: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  // Store
  store_name: string;
  store_address: string;
  store_phone: string;
  store_website: string;
  store_number: string;
  // Transaction
  purchase_date: string;
  purchase_time: string;
  employee_name: string;
  order_number: string;
  // Financials
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  // Payment
  payment_method: string;
  payment_amount: number;
  card_last4: string;
  card_aid: string;
  payments: PaymentMethod[] | null;
  // Rewards
  reward_card_number: string;
  reward_program_name: string;
  reward_points_current: number;
  reward_points_required: number;
  // Discount
  discount_code: string | null;
  // Restaurant
  tip: number;
  gratuity: number;
  // POS / meta
  pos_system: string;
  image_path: string;
  item_count: number;
  created_at: string;
}

const PaymentMethodSchema = z.object({
  method: z.string().default(''),
  amount: z.number().default(0),
  card_last4: z.string().default(''),
  card_aid: z.string().default(''),
});

export const ExtractedReceiptSchema = z.object({
  is_receipt: z.boolean(),
  rejection_reason: z.string().default(''),
  store_name: z.string().default(''),
  store_address: z.string().default(''),
  store_phone: z.string().default(''),
  store_website: z.string().default(''),
  store_number: z.string().default(''),
  purchase_date: z.string().default(''),
  purchase_time: z.string().default(''),
  employee_name: z.string().default(''),
  order_number: z.string().default(''),
  subtotal: z.number().default(0),
  discount: z.number().default(0),
  tax_rate: z.number().default(0),
  tax_amount: z.number().default(0),
  total: z.number().default(0),
  payment_method: z.string().default(''),
  payment_amount: z.number().default(0),
  card_last4: z.string().default(''),
  card_aid: z.string().default(''),
  payments: z.array(PaymentMethodSchema).default([]),
  reward_card_number: z.string().default(''),
  reward_program_name: z.string().default(''),
  reward_points_current: z.number().default(0),
  reward_points_required: z.number().default(0),
  discount_code: z.string().nullable().default(null),
  tip: z.number().default(0),
  gratuity: z.number().default(0),
  pos_system: z.string().default(''),
  items: z.array(z.object({
    name: z.string().default(''),
    category: z.string().default('Other'),
    quantity: z.number().default(1),
    unit_price: z.number().default(0),
    discount: z.number().default(0),
    total_price: z.number().default(0),
  })).default([]),
});

export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;
