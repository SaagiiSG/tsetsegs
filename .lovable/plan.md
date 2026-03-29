

# Add Language Toggle (MON/ENG) to Landing Page

## Overview
Add a language switcher to the landing page header area, defaulting to Mongolian. All visible text strings will be translated.

## Approach

### 1. Translation dictionary
Define a `translations` object at the top of `Index.tsx` with keys for every text string on the page, mapped to `mon` and `eng` values. Covers: badge text, headline, subtitle, feature titles/descriptions, section headers, CTA text, stats labels, team roles, footer text.

### 2. Language state
Add `useState<'mon' | 'eng'>('mon')` inside the `Index` component. Create a helper `t(key)` that returns the correct string.

### 3. Language toggle UI
Place a small pill-style toggle in the top-right corner of the hero section (fixed or absolute, z-50). Two segments: **МОН** / **ENG**, styled with the gold theme. Active segment gets a filled gold background.

### 4. Replace all hardcoded strings
Swap every hardcoded English string in the JSX with `t('keyName')` calls.

## Files Modified
- `src/pages/Index.tsx` — Add translations dict, language state, toggle UI, replace all strings

## Mongolian Translations (key examples)
- "Mongolia's Best SAT Math Center" → "Монголын шилдэг SAT математикийн төв"
- "Master the SAT" → "SAT-ыг эзэмш"
- "Score Higher" → "Өндөр оноо ав"
- "Why Choose Us" → "Яагаад биднийг сонгох вэ"
- "Smart Practice" → "Ухаалаг дасгал"
- "Ready to Start Your SAT Journey?" → "SAT-ын аялалаа эхлэхэд бэлэн үү?"
- etc.

