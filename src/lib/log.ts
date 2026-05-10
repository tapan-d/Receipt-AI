const isDev = process.env.NODE_ENV === 'development';

export const log = (...args: unknown[]) => {
  if (isDev) console.log('[dev]', ...args);
};

export const logWarn = (...args: unknown[]) => {
  if (isDev) console.warn('[dev:warn]', ...args);
};

export const logError = (...args: unknown[]) => {
  if (isDev) console.error('[dev:error]', ...args);
};
