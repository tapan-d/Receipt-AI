import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import { isEmailAllowed } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, Apple],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async signIn({ user }) {
      return isEmailAllowed(user.email ?? '');
    },
  },
});
