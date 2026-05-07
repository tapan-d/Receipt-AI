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

export interface ExtractedReceipt {
  is_receipt: boolean;
  rejection_reason: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_website: string;
  store_number: string;
  purchase_date: string;
  purchase_time: string;
  employee_name: string;
  order_number: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  payment_amount: number;
  card_last4: string;
  card_aid: string;
  payments: PaymentMethod[];
  reward_card_number: string;
  reward_program_name: string;
  reward_points_current: number;
  reward_points_required: number;
  discount_code: string | null;
  tip: number;
  gratuity: number;
  pos_system: string;
  items: {
    name: string;
    category: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total_price: number;
  }[];
}
