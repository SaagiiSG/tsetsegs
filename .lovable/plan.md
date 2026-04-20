
## Confirmed bug

User confirms the exact symptom: question text/passage and multiple-choice options that contain literal currency like `$5`, `$4`, `$3` are displaying with the `$` rendered (good intent), but the surrounding text gets garbled because the math-split regex `/(\$[^$]+\$)/g` in `MathText.tsx` greedily pairs two `$` signs and feeds the inner text to KaTeX.

Example: `"A pole is $5 inches and a rope is $3 inches"` → split pairs `$5 inches and a rope is $3` → KaTeX tries to render "5 inches and a rope is 3" as math → broken output. Same for option lists where multiple options share the page (`A. $4`, `B. $3`).

## Fix (minimal, isolated to currency only)

Single file: `src/components/MathText.tsx`

1. Define `const CURRENCY_TOKEN = '\uE000'` (Unicode private-use area, won't appear in any real content)
2. **Before** `autoDetectMath()` runs, swap literal currency:
   ```ts
   text = text.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, `${CURRENCY_TOKEN}$1`)
   ```
3. Run existing `autoDetectMath` + math-split + KaTeX rendering completely unchanged
4. **In the plain-text branch only** (after `formatted = part`), restore:
   ```ts
   formatted = formatted.replace(/\uE000/g, '$')
   ```
5. Keep the existing pure-digit dollar-amount fallback inside the math branch as a second safety net (no removal)

## Why this is safe for every other set

- `autoDetectMath` regexes never produce or consume `\uE000` — output identical for non-currency strings
- Real LaTeX (`$x^2$`, `$\frac{1}{2}$`, `$\sqrt{3}$`) doesn't start with `$<digit-followed-by-non-math>`, so the currency regex won't match it
- Strings with no `$<digits>` pattern flow through completely unchanged
- The placeholder is stripped to `$` only in the plain-text rendering branch, so KaTeX never sees it
- 68-set, CB, English, 150-set math expressions, and rationale rendering all unaffected

## Out of scope (separate, after this fix ships)

The 150-set answer audit against `SATMathTrainingfor800.pdf` — will do a read-only diff to `/mnt/documents/sat800_answer_diff.csv` after this fix lands, then propose answer-correction migration on user approval. No DB writes without explicit approval.

## File touched
- `src/components/MathText.tsx` only
