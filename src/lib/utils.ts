import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLAIN_NUMBER_REGEX = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

const normalizeAnswerText = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();

const stripNumericFormatting = (value: string) => value.trim().replace(/,/g, '');

const parsePlainNumber = (value: string) => {
  const normalized = stripNumericFormatting(value);

  if (!PLAIN_NUMBER_REGEX.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getDecimalPlaces = (value: string) => {
  const normalized = stripNumericFormatting(value);
  const [, decimals = ''] = normalized.split('.');
  return decimals.length;
};

const roundToPlaces = (value: number, places: number) => {
  if (places <= 0) {
    return Math.round(value);
  }

  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const numericAnswersMatch = (submitted: string, expected: string) => {
  const submittedNumber = parsePlainNumber(submitted);
  const expectedNumber = parsePlainNumber(expected);

  if (submittedNumber === null || expectedNumber === null) {
    return false;
  }

  if (submittedNumber === expectedNumber) {
    return true;
  }

  const expectedPlaces = getDecimalPlaces(expected);
  if (expectedPlaces === 0) {
    return false;
  }

  return roundToPlaces(submittedNumber, expectedPlaces) === roundToPlaces(expectedNumber, expectedPlaces);
};

export function isAcceptedFillBlankAnswer(submitted: string, expected: string, alternates?: string[] | null) {
  if (normalizeAnswerText(submitted) === normalizeAnswerText(expected) || numericAnswersMatch(submitted, expected)) {
    return true;
  }

  return alternates?.some((alternate) => {
    return normalizeAnswerText(submitted) === normalizeAnswerText(alternate) || numericAnswersMatch(submitted, alternate);
  }) ?? false;
}
