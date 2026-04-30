import { NextResponse } from 'next/server';
import { getAllItems } from '@/lib/db';

export async function GET() {
  try {
    const items = await getAllItems();
    return NextResponse.json(items);
  } catch (err) {
    console.error('Items error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
