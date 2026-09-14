# International student sign-up: English form + international phone numbers

## Goal
When a student scans the QR code of an international class, the whole sign-up flow appears in English and accepts a phone number from any country (US, etc.). Mongolian classes keep exactly today's Mongolian form and 8-digit phone rule.

## How it decides
The sign-up link already carries the class it belongs to. The page will also read whether that class is marked international, and switch to "international mode":

```text
QR link -> class -> international? -> yes: English form + world phone field
                                   -> no : Mongolian form + 8-digit phone (unchanged)
```

The code-based sign-up (typing a 6-character code, no class attached) stays Mongolian as it is today.

## What changes for international students

1. **Language** — every label, hint, button, error message, and the success screen appear in English. Mongolian text stays untouched for everyone else.
2. **Phone number** — one field where they type the full number with country code, e.g. `+1 415 555 0134`. Spaces, dashes, and brackets are accepted while typing; the number is saved in one clean standard form (`+14155550134`) so sign-in later works.
   - Accepted: starts with `+`, 8 to 15 digits after formatting is stripped.
   - Clear English error when it doesn't look like a valid number.
3. **Parent phone** — still required, and uses the same international field.
4. **School and grade** — still both asked, with English labels (Grade 8 - Grade 12, school name typed freely).
5. **Prior SAT score / planned test date** — same questions, English wording and English month names.
6. **Duplicate check** — comparing digits only, so `+1 415 555 0134` and `+14155550134` count as the same person.

## Sign-in
The student sign-in phone box currently strips anything non-numeric and caps input at 8 digits, so an international number can't be typed at all. It will accept a leading `+` and up to 15 digits, and match the saved number. Mongolian students can still type their 8 digits exactly as before.

Also worth knowing: SMS confirmations only go to Mongolian numbers today, so international students simply don't get one — nothing breaks.

## Technical notes
- `src/pages/ReviewRegistration.tsx`: add `is_international` to the batch fetch; hold a `locale` value (`mn` | `en`) derived from it; move all user-facing strings into a small in-file dictionary keyed by locale; build the zod schema from the locale so phone rules and messages differ per mode; normalize phone/parent phone to E.164 before insert.
- New tiny helper (e.g. `src/lib/phone.ts`) with `normalizeInternationalPhone`, `isValidInternationalPhone`, and `digitsOnly` — reused by the sign-up page and the sign-in field.
- `src/pages/StudentPortal.tsx`: relax the phone input sanitizer/`maxLength` to allow `+` and up to 15 digits; keep the existing exact-match lookup, which already works with any stored string.
- `students.phone` and `student_accounts.phone_number` are plain text and matched by exact string / digit comparison in the linking trigger, so no schema change is needed.
- `normalize_mn_phone` returns NULL for non-8-digit numbers, but it is only used by future auth plumbing, not by this flow, so it stays as is.

## Out of scope
- SMS or WhatsApp delivery to international numbers.
- Translating the student dashboard/practice pages.
- Changing the code-based (non-QR) sign-up flow.
