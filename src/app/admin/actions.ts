'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addAllowedEmail, removeAllowedEmail } from '@/lib/db';

async function requireAdmin(): Promise<void> {
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];
  const session = await auth();
  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    redirect('/');
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addEmailAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get('email') as string).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return;
  await addAllowedEmail(email);
  revalidatePath('/admin');
}

export async function removeEmailAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get('email') as string).trim().toLowerCase();
  await removeAllowedEmail(email);
  revalidatePath('/admin');
}
