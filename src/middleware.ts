import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|sign-in|favicon\\.ico).*)'],
};
