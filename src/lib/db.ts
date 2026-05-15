import { neon } from '@neondatabase/serverless';
import type { Receipt, ReceiptItem } from './types';
import { log } from './log';

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

// Runs once per process instance — CREATE IF NOT EXISTS is idempotent
let schemaInit: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  const sql = getDb();
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
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
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tip FLOAT8 DEFAULT 0`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS gratuity FLOAT8 DEFAULT 0`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payments JSONB`;
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_hash TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      store_name TEXT, purchase_date TEXT,
      item_name TEXT, category TEXT,
      quantity FLOAT8, unit_price FLOAT8, discount FLOAT8 DEFAULT 0, total_price FLOAT8,
      vector vector(1024)
    )
  `;
  await sql`ALTER TABLE receipt_items ADD COLUMN IF NOT EXISTS discount FLOAT8 DEFAULT 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS allowed_emails (
      email TEXT PRIMARY KEY,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Auth.js / NextAuth adapter tables
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT,
      email TEXT UNIQUE,
      "emailVerified" TIMESTAMPTZ,
      image TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE (provider, "providerAccountId")
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "sessionToken" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;
  // One-time migration: seed from ALLOWED_EMAILS env var if table is empty
  const envEmails = process.env.ALLOWED_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];
  if (envEmails.length > 0) {
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM allowed_emails` as { count: number }[];
    if (count === 0) {
      for (const email of envEmails) {
        await sql`INSERT INTO allowed_emails (email) VALUES (${email}) ON CONFLICT DO NOTHING`;
      }
    }
  }
}

function ready(): Promise<void> {
  if (!schemaInit) schemaInit = ensureSchema();
  return schemaInit;
}

export function ensureSchemaReady(): Promise<void> {
  return ready();
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
      card_last4, card_aid, payments, reward_card_number, reward_program_name,
      reward_points_current, reward_points_required, discount_code,
      tip, gratuity, pos_system, image_path, image_hash, item_count, created_at
    ) VALUES (
      ${receipt.id}, ${receipt.user_id}, ${receipt.store_name}, ${receipt.store_address},
      ${receipt.store_phone}, ${receipt.store_website}, ${receipt.store_number},
      ${receipt.purchase_date}, ${receipt.purchase_time}, ${receipt.employee_name},
      ${receipt.order_number}, ${receipt.subtotal}, ${receipt.discount}, ${receipt.tax_rate},
      ${receipt.tax_amount}, ${receipt.total}, ${receipt.payment_method}, ${receipt.payment_amount},
      ${receipt.card_last4}, ${receipt.card_aid},
      ${receipt.payments ? JSON.stringify(receipt.payments) : null},
      ${receipt.reward_card_number}, ${receipt.reward_program_name},
      ${receipt.reward_points_current}, ${receipt.reward_points_required},
      ${receipt.discount_code}, ${receipt.tip}, ${receipt.gratuity},
      ${receipt.pos_system}, ${receipt.image_path}, ${receipt.image_hash ?? null},
      ${receipt.item_count}, ${receipt.created_at}
    )
  `;

  for (const item of items) {
    if (item.vector.length > 0) {
      const vec = `[${item.vector.join(',')}]`;
      await sql`
        INSERT INTO receipt_items (
          id, receipt_id, user_id, store_name, purchase_date,
          item_name, category, quantity, unit_price, discount, total_price, vector
        ) VALUES (
          ${item.id}, ${item.receipt_id}, ${item.user_id}, ${item.store_name},
          ${item.purchase_date}, ${item.item_name}, ${item.category},
          ${item.quantity}, ${item.unit_price}, ${item.discount}, ${item.total_price}, ${vec}::vector
        )
      `;
    } else {
      await sql`
        INSERT INTO receipt_items (
          id, receipt_id, user_id, store_name, purchase_date,
          item_name, category, quantity, unit_price, discount, total_price
        ) VALUES (
          ${item.id}, ${item.receipt_id}, ${item.user_id}, ${item.store_name},
          ${item.purchase_date}, ${item.item_name}, ${item.category},
          ${item.quantity}, ${item.unit_price}, ${item.discount}, ${item.total_price}
        )
      `;
    }
  }
}

const DUPE_NAME_THRESHOLD = 0.7;

export async function setReceiptHash(id: string, userId: string, hash: string): Promise<void> {
  await ready();
  const sql = getDb();
  await sql`UPDATE receipts SET image_hash = ${hash} WHERE id = ${id} AND user_id = ${userId} AND image_hash IS NULL`;
}

export async function findReceiptByHash(userId: string, hash: string): Promise<Receipt | null> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM receipts WHERE user_id = ${userId} AND image_hash = ${hash} LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as unknown as Receipt) : null;
}

export async function findDuplicateReceipt(
  userId: string,
  storeName: string,
  purchaseDate: string,
  total: number,
): Promise<Receipt | null> {
  await ready();
  const sql = getDb();
  const candidates = await sql`
    SELECT *, similarity(LOWER(store_name), LOWER(${storeName})) AS name_sim
    FROM receipts
    WHERE user_id = ${userId}
      AND purchase_date = ${purchaseDate}
      AND ABS(total - ${total}) < 0.01
    ORDER BY name_sim DESC
    LIMIT 5
  ` as unknown as (Receipt & { name_sim: number })[];

  if (candidates.length === 0) {
    log(`dupe-check: no candidates for date=${purchaseDate} total=${total}`);
    return null;
  }

  for (const row of candidates) {
    const sim = Number(row.name_sim);
    const matched = sim >= DUPE_NAME_THRESHOLD;
    log(`dupe-check: candidate="${row.store_name}" similarity=${sim.toFixed(2)} threshold=${DUPE_NAME_THRESHOLD} matched=${matched}`);
    if (matched) return row;
  }
  return null;
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

export async function getItemsByReceiptId(receiptId: string, userId: string): Promise<ReceiptItem[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT id, receipt_id, user_id, store_name, purchase_date,
           item_name, category, quantity, unit_price, discount, total_price
    FROM receipt_items WHERE receipt_id = ${receiptId} AND user_id = ${userId}
  `;
  return rows.map(r => ({ ...r, vector: [] })) as unknown as ReceiptItem[];
}

export async function getAllItems(userId: string): Promise<ReceiptItem[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`
    SELECT id, receipt_id, user_id, store_name, purchase_date,
           item_name, category, quantity, unit_price, discount, total_price
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
           item_name, category, quantity, unit_price, discount, total_price
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

export async function deleteReceipt(id: string, userId: string): Promise<void> {
  await ready();
  const sql = getDb();
  await sql`DELETE FROM receipt_items WHERE receipt_id = ${id} AND user_id = ${userId}`;
  await sql`DELETE FROM receipts WHERE id = ${id} AND user_id = ${userId}`;
}

export async function migrateUserDataIfNeeded(email: string, uuid: string): Promise<void> {
  const sql = getDb();
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM receipts WHERE user_id = ${email}
  ` as { count: number }[];
  if (count === 0) return;
  await sql`UPDATE receipts SET user_id = ${uuid} WHERE user_id = ${email}`;
  await sql`UPDATE receipt_items SET user_id = ${uuid} WHERE user_id = ${email}`;
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  await ready();
  const sql = getDb();
  const [row] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM allowed_emails) AS total,
      (SELECT COUNT(*)::int FROM allowed_emails WHERE email = ${email}) AS match
  ` as { total: number; match: number }[];
  if (row.total === 0) return true;
  return row.match > 0;
}

export async function getAllowedEmails(): Promise<string[]> {
  await ready();
  const sql = getDb();
  const rows = await sql`SELECT email FROM allowed_emails ORDER BY added_at ASC`;
  return rows.map((r) => r.email as string);
}

export async function addAllowedEmail(email: string): Promise<void> {
  await ready();
  const sql = getDb();
  await sql`INSERT INTO allowed_emails (email) VALUES (${email}) ON CONFLICT DO NOTHING`;
}

export async function removeAllowedEmail(email: string): Promise<void> {
  await ready();
  const sql = getDb();
  await sql`DELETE FROM allowed_emails WHERE email = ${email}`;
}
