import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLAIN_NUMBER_REGEX = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

// SAT answer box: 5 characters for positive answers, 6 when a minus sign is used.
const answerCharLimit = (raw: string) => (raw.startsWith('-') ? 6 : 5);

const parseFillValue = (value: string) => {
  const raw = value.trim().replace(/[\s,]/g, '');
  if (!raw) return null;

  if (raw.includes('/')) {
    const [num, den] = raw.split('/');
    if (!PLAIN_NUMBER_REGEX.test(num ?? '') || !PLAIN_NUMBER_REGEX.test(den ?? '')) return null;
    const d = Number(den);
    if (!d) return null;
    const result = Number(num) / d;
    return Number.isFinite(result) ? result : null;
  }

  if (!PLAIN_NUMBER_REGEX.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// Accept a value that is the other value rounded OR truncated to the precision the
// student could fit in the answer box, as long as at least 3 digits were used.
const approximationMatches = (approx: string, exactValue: number) => {
  const raw = approx.trim().replace(/[\s,]/g, '');
  if (raw.includes('/')) return false;
  if (raw.length > answerCharLimit(raw)) return false;
  if (raw.replace(/[^0-9]/g, '').length < 3) return false;

  const approxValue = parseFillValue(raw);
  if (approxValue === null) return false;

  const places = raw.split('.')[1]?.length ?? 0;
  const factor = 10 ** places;
  const rounded = roundToPlaces(exactValue, places);
  const truncated = Math.trunc(exactValue * factor) / factor;
  return nearlyEqual(rounded, approxValue) || nearlyEqual(truncated, approxValue);
};

const normalizeAnswerText = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();


const roundToPlaces = (value: number, places: number) => {
  if (places <= 0) {
    return Math.round(value);
  }

  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const valuesMatch = (submitted: string, expected: string) => {
  const submittedValue = parseFillValue(submitted);
  const expectedValue = parseFillValue(expected);

  if (submittedValue === null || expectedValue === null) {
    return false;
  }

  if (nearlyEqual(submittedValue, expectedValue)) {
    return true;
  }

  // Either side may be the shortened form that fits the answer box.
  return approximationMatches(submitted, expectedValue) || approximationMatches(expected, submittedValue);
};

export function isAcceptedFillBlankAnswer(submitted: string, expected: string, alternates?: string[] | null) {
  if (normalizeAnswerText(submitted) === normalizeAnswerText(expected) || valuesMatch(submitted, expected)) {
    return true;
  }

  return alternates?.some((alternate) => {
    return normalizeAnswerText(submitted) === normalizeAnswerText(alternate) || valuesMatch(submitted, alternate);
  }) ?? false;
}
