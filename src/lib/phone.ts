/**
 * Phone helpers shared by student sign-up and sign-in.
 *
 * Mongolian students keep the plain 8-digit local format that is already
 * stored in `students.phone` / `student_accounts.phone_number`.
 * International students store E.164 (`+14155550134`).
 */

export function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Sanitizes typing: keeps a single leading "+" and digits. */
export function sanitizePhoneInput(value: string, maxDigits = 15): string {
  const hasPlus = value.trim().startsWith("+");
  const digits = digitsOnly(value).slice(0, maxDigits);
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalizes an international number to E.164.
 * Returns null when it cannot be understood.
 */
export function normalizeInternationalPhone(value: string): string | null {
  const digits = digitsOnly(value);
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function isValidInternationalPhone(value: string): boolean {
  return normalizeInternationalPhone(value) !== null;
}

export function isValidMongolianPhone(value: string): boolean {
  return /^\d{8}$/.test(value.trim());
}
