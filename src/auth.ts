import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import NeonAdapter from '@auth/neon-adapter';
import { Pool } from '@neondatabase/serverless';
import { isEmailAllowed, migrateUserDataIfNeeded } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonAdapter(new Pool({ connectionString: process.env.DATABASE_URL! })),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  providers: [Google, Apple],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async signIn({ user }) {
      return isEmailAllowed(user.email ?? '');
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        migrateUserDataIfNeeded(user.email!, user.id!).catch(() => {});
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});