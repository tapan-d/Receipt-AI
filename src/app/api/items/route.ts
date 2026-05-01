import { NextResponse } from 'next/server';
import { getAllItems } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const items = await getAllItems(userId);
    return NextResponse.json(items);
  } catch (err) {
    console.error('Items error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
