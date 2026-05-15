import { NextRequest, NextResponse } from 'next/server';
import { findReceiptByHash } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { log } from '@/lib/log';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const hash = request.nextUrl.searchParams.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
    return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
  }

  const existing = await findReceiptByHash(userId, hash);
  if (existing) {
    log(`preflight: hash match id=${existing.id}`);
    return NextResponse.json({ duplicate: true, id: existing.id }, { status: 409 });
  }

  log(`preflight: no match for hash=${hash.slice(0, 8)}...`);
  return NextResponse.json({ duplicate: false }, { status: 200 });
}