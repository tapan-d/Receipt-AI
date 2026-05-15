export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureSchemaReady } = await import('@/lib/db');
    await ensureSchemaReady();
  }
}
