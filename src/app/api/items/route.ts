import { NextResponse } from 'next/server';
import { getAllItems } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { log, logError } from '@/lib/log';

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  try {
    const items = await getAllItems(userId);
    log(`items GET: count=${items.length}`);
    return NextResponse.json(items);
  } catch (err) {
    logError('items GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
