import * as lancedb from '@lancedb/lancedb';
import path from 'path';
import type { Receipt, ReceiptItem } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'lancedb');

let db: lancedb.Connection | null = null;

async function getDb(): Promise<lancedb.Connection> {
  if (!db) {
    db = await lancedb.connect(DB_PATH);
  }
  return db;
}

async function getReceiptItemsTable() {
  const conn = await getDb();
  const tables = await conn.tableNames();
  if (!tables.includes('receipt_items')) {
    return null;
  }
  return conn.openTable('receipt_items');
}

async function getReceiptsTable() {
  const conn = await getDb();
  const tables = await conn.tableNames();
  if (!tables.includes('receipts')) {
    return null;
  }
  return conn.openTable('receipts');
}

export async function saveReceipt(receipt: Receipt, items: ReceiptItem[]): Promise<void> {
  const conn = await getDb();
  const tables = await conn.tableNames();

  if (!tables.includes('receipts')) {
    await conn.createTable('receipts', [receipt] as unknown as Record<string, unknown>[]);
  } else {
    const tbl = await conn.openTable('receipts');
    await tbl.add([receipt] as unknown as Record<string, unknown>[]);
  }

  if (items.length > 0) {
    if (!tables.includes('receipt_items')) {
      await conn.createTable('receipt_items', items as unknown as Record<string, unknown>[]);
    } else {
      const tbl = await conn.openTable('receipt_items');
      await tbl.add(items as unknown as Record<string, unknown>[]);
    }
  }
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const tbl = await getReceiptsTable();
  if (!tbl) return [];
  const rows = await tbl.query().toArray();
  return rows as unknown as Receipt[];
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const tbl = await getReceiptsTable();
  if (!tbl) return null;
  const rows = await tbl.query().where(`id = '${id}'`).toArray();
  return rows.length > 0 ? (rows[0] as unknown as Receipt) : null;
}

export async function getItemsByReceiptId(receiptId: string): Promise<ReceiptItem[]> {
  const tbl = await getReceiptItemsTable();
  if (!tbl) return [];
  const rows = await tbl.query().where(`receipt_id = '${receiptId}'`).toArray();
  return rows as unknown as ReceiptItem[];
}

export async function searchItemsByVector(
  queryVector: number[],
  limit = 100,
  filter?: string
): Promise<ReceiptItem[]> {
  const tbl = await getReceiptItemsTable();
  if (!tbl) return [];

  let search = tbl.vectorSearch(queryVector).limit(limit);
  if (filter) {
    search = search.where(filter);
  }
  const rows = await search.toArray();
  return rows as unknown as ReceiptItem[];
}

export async function getReceiptsByIds(ids: string[]): Promise<Receipt[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(ids.map(id => getReceiptById(id)));
  return results.filter((r): r is Receipt => r !== null);
}

export async function getAllItems(): Promise<ReceiptItem[]> {
  const tbl = await getReceiptItemsTable();
  if (!tbl) return [];
  const rows = await tbl.query().toArray();
  return rows as unknown as ReceiptItem[];
}
