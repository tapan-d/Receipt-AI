import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';

const ALLOWED_EMAILS =
  process.env.ALLOWED_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, Apple],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async signIn({ user }) {
      // Invite-only: reject if allowlist is set and email not in it.
      // To open access, remove ALLOWED_EMAILS from env.
      if (ALLOWED_EMAILS.length === 0) return true;
      return ALLOWED_EMAILS.includes(user.email ?? '');
    },
  },
});
