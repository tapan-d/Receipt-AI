export const QUESTION_MAX_LENGTH = 500;

const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// \b before word-only terms; separate branch for "system:" etc. (no \b after ":" since ":" is non-word)
// and separate branch for XML role tags (no \b before "<" since "<" is non-word)
const QUESTION_INJECTION_RE =
  /\b(?:ignore|disregard|forget|override)\b|\b(?:system|assistant|human)\s*:|<\s*\/?\s*(?:system|assistant|human|instruction)\s*>/gi;

// Same fix for field regex — no trailing \b after ":" patterns
const FIELD_INJECTION_RE =
  /\b(?:ignore|disregard|forget|override)\b|\b(?:system|assistant|human)\s*:|\b(?:you are|act as|new instructions?|previous instructions?)\b/gi;

const FIELD_STRUCTURAL_CHARS_RE = /[\n\r\t`<>]/g;

export function sanitizeQuestion(
  raw: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Question must be a string.' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Question is empty.' };
  if (trimmed.length > QUESTION_MAX_LENGTH)
    return { ok: false, error: `Question exceeds ${QUESTION_MAX_LENGTH} character limit.` };
  const cleaned = trimmed
    .replace(CONTROL_CHAR_RE, '')
    .replace(QUESTION_INJECTION_RE, '[...]');
  return { ok: true, value: cleaned };
}

export function sanitizeReceiptField(value: unknown, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, maxLength)
    .replace(FIELD_STRUCTURAL_CHARS_RE, ' ')
    .replace(FIELD_INJECTION_RE, '[...]')
    .replace(CONTROL_CHAR_RE, '')
    .trim();
}

export function buildQueryPrompt(context: string, question: string): string {
  return [
    '<receipt_data>',
    context,
    '</receipt_data>',
    '<user_question>',
    question,
    '</user_question>',
  ].join('\n');
}
