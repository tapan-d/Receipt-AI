import { neon } from '@neondatabase/serverless';
import type { Receipt, ReceiptItem } from './types';

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

// Runs once per process instance — CREATE IF NOT EXISTS is idempotent
let schemaInit: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  const sql = getDb();
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      store_name TEXT, store_address TEXT, store_phone TEXT,
      store_website TEXT, store_number TEXT,
      purchase_date TEXT, purchase_time TEXT,
      employee_name TEXT, order_number TEXT,
      subtotal FLOAT8, discount FLOAT8, tax_rate FLOAT8,
      tax_amount FLOAT8, total FLOAT8,
      payment_method TEXT, payment_amount FLOAT8,
      card_last4 TEXT, card_aid TEXT,
      reward_card_number TEXT, reward_program_name TEXT,
      reward_points_current FLOAT8, reward_points_required FLOAT8,
      discount_code TEXT,
      pos_system TEXT, image_path TEXT,
      item_count INT, created_at TEXT
    )
  `;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_code TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      store_name TEXT, purchase_date TEXT,
      item_name TEXT, category TEXT,
      quantity FLOAT8, unit_price FLOAT8, total_price FLOAT8,
      vector vector(1024)
    )
  `;
}

function ready(): Promise<void> {
  if (!schemaInit) schemaInit = ensureSchema();
  return schemaInit;
}

export async function saveReceipt(receipt: Receipt, items: ReceiptItem[]): Promise<void> {
  await ready();
  const sql = getDb();

  await sql`
    INSERT INTO receipts (
      id, user_id, store_name, store_address, store_phone,
      store_website, store_number, purchase_date, purchase_time,
      employee_name, order_number, subtotal, discount, tax_rate,
      tax_amount, total, payment_method, payment_amount,
      card_last4, card_aid, reward_card_number, reward_program_name,
      reward_points_current, reward_points_required, discount_code,
      pos_system, image_path, item_count, created_at
    ) VALUES (
      ${receipt.id}, ${receipt.user_id}, ${receipt.store_name}, ${receipt.store_address},
      ${receipt.store_phone}, ${receipt.store_website}, ${receipt.store_number},
      ${receipt.purchase_date}, ${receipt.purchase_time}, ${receipt.employee_name},
      ${receipt.order_number}, ${receipt.subtotal}, ${receipt.discount}, ${receipt.tax_rate},
      ${receipt.tax_amount}, ${receipt.total}, ${receipt.payment_method}, ${receipt.payment_amount},
      ${receipt.card_last4}, ${receipt.card_aid}, ${receipt.reward_card_number},
      ${receipt.reward_program_name}, ${receipt.reward_points_current},
      ${receipt.reward_points_required}, ${receipt.discount_code},
      ${receipt.pos_system}, ${receipt.image_path},
      ${receipt.item_count}, ${receipt.created_at}
    )
  `;

  for (const item of items) {
    if (item.vector.length > 0) {
      const vec = `[${item.vector.join(',')}]`;
      await sql`
        INSERT INTO receipt_items (
          id, receipt_id, user_id, store_name, purchase_date,
          item_name, category, quantity, unit_price, total_price, vector
        ) VALUES (
          ${item.id}, ${item.receipt_id}, ${item.user_id}, ${item.store_name},
          ${item.purchase_date}, ${item.item_name}, ${item.category},
          ${item.quantity}, ${item.unit_price}, ${item.total_price}, ${vec}::vector
        )
      `;
    } else {
      await sql`
        INSERT INTO receipt_items (
          id, receipt_id, user_id, store_name, purchase_date,
          item_name, category, quantity, unit_price, total_price
        ) VALUES (
          ${item.id}, ${item.receipt_id}, ${item.user_id}, ${item.store_name},
          ${item.purchase_date}, ${item.item_name}, ${item.category},
          ${item.quantity}, ${item.unit_price}, ${item.total_price}
        )
      `;
    }
  }
}

export async function getAllReceipts(userId: string): Promise<Receipt[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM receipts WHERE user_id = ${userId} ORDER BY purchase_date DESC, created_at DESC
  `;
  return rows as unknown as Receipt[];
}

export async function getReceiptById(id: string, userId: string): Promise<Receipt | null> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM receipts WHERE id = ${id} AND user_id = ${userId}
  `;
  return rows.length > 0 ? (rows[0] as unknown as Receipt) : null;
}

export async function getItemsByReceiptId(receiptId: string): Promise<ReceiptItem[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT id, receipt_id, user_id, store_name, purchase_date,
           item_name, category, quantity, unit_price, total_price
    FROM receipt_items WHERE receipt_id = ${receiptId}
  `;
  return rows.map(r => ({ ...r, vector: [] })) as unknown as ReceiptItem[];
}

export async function getAllItems(userId: string): Promise<ReceiptItem[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT id, receipt_id, user_id, store_name, purchase_date,
           item_name, category, quantity, unit_price, total_price
    FROM receipt_items WHERE user_id = ${userId}
  `;
  return rows.map(r => ({ ...r, vector: [] })) as unknown as ReceiptItem[];
}

export async function searchItemsByVector(
  queryVector: number[],
  limit: number,
  userId: string,
): Promise<ReceiptItem[]> {
  await ready();
  const sql = getDb();
  const vec = `[${queryVector.join(',')}]`;
  const rows = await sql`
    SELECT id, receipt_id, user_id, store_name, purchase_date,
           item_name, category, quantity, unit_price, total_price
    FROM receipt_items
    WHERE user_id = ${userId} AND vector IS NOT NULL
    ORDER BY vector <=> ${vec}::vector
    LIMIT ${limit}
  `;
  return rows.map(r => ({ ...r, vector: [] })) as unknown as ReceiptItem[];
}

export async function getReceiptsByIds(ids: string[], userId: string): Promise<Receipt[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map(id => getReceiptById(id, userId)));
  return results.filter((r): r is Receipt => r !== null);
}

export async function deleteReceipt(id: string): Promise<void> {
  await ready();
  const sql = getDb();
  await sql`DELETE FROM receipt_items WHERE receipt_id = ${id}`;
  await sql`DELETE FROM receipts WHERE id = ${id}`;
}
