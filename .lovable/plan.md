## Problem

In question 6805 (and other 68-set geometry items), text like `$FGH$`, `$KLM$`, `$GH$`, `$LM$`, `$GHF$` shows up with the literal `$` characters instead of italicized math variables.

## Root cause

`src/components/MathText.tsx` uses a "prose detector" to protect mispaired currency like `I have $36 and spent $20`:

```ts
const PROSE = /(?:^|\s)[a-zA-Z]{2,}(?:\s|[.,;:!?]|$)/;
```

For an inner span of `FGH`, this regex matches (start-of-string + 2+ letters + end-of-string), so the opening `$` is treated as currency and KaTeX is never tried. Single letters (`$G$`, `$L$`) escape because of `{2,}`, which is exactly why only multi-letter geometry labels look broken.

## Fix (one file, UI only)

In `src/components/MathText.tsx`, tighten the prose check so it fires on actual prose, not on a single uppercase token:

1. Replace the `PROSE` regex to require **either**:
   - whitespace inside the span (real prose has spaces), OR
   - a lowercase word of 2+ letters (`\b[a-z]{2,}\b`) — geometry labels are uppercase, so they won't match; words like "and", "spent", "per" still will.
2. Before running the prose check, short-circuit: if `inner` is a single whitespace-free token, skip the heuristic and go straight to the KaTeX trial render. KaTeX failure still falls back to literal `$`, so genuine currency is unaffected.

## Why this won't break other rendering paths

The tokenizer in `MathText` has multiple ordered branches; this change only narrows step (2) "treat opening `$` as currency without trying KaTeX". Every other branch is preserved:

- **Display math `$$...$$`** — handled in branch (0) before the prose check. Untouched.
- **Already-LaTeX content** — `autoDetectMath` early-returns when `$...$` is present. Untouched.
- **Single-letter math `$G$`, `$x$`** — already worked, still works (KaTeX trial render path).
- **Pure numbers `$-4$`, `$36$`** — still hit the "render bare to avoid italic" branch at line 223.
- **Currency `$36`, `$96`** — no closing `$`, falls through to literal. Untouched.
- **Mispaired currency `I have $36 and spent $20`** — inner span is `36 and spent ` which contains whitespace AND lowercase words, so refined PROSE still matches → still treated as currency. ✅
- **Auto-detected unicode/notation (`x²`, `√3`, `π`, `≤`, exponents, fractions)** — produced upstream in `autoDetectMath`, then trial-rendered by KaTeX. The change only makes KaTeX MORE likely to be tried, never less, so these keep working.
- **Markdown post-processing (`**bold**`, `*em*`, `~sub~`, `^sup^`, `\n`)** — runs in the `text` branch only; unchanged.

The only behavior change: spans whose inner is a single whitespace-free uppercase token (`FGH`, `KLM`, `GH`, `LM`, `GHF`, `FH`, `KM`, etc.) now reach KaTeX and render italic. Nothing else is affected.

## Verification checklist

After implementing:
1. Q6805 in the 68 set — `FGH`, `KLM`, `GH`, `LM`, `GHF`, `FH`, `KM` render italic, no visible `$`.
2. A word problem with currency (e.g. "I have $36 and spent $20") — dollars still render as literal currency.
3. A CB algebra question with `$$\frac{a}{b}$$` — display equation still renders correctly.
4. A unicode-heavy question (`x²`, `√3`, `π`) — still auto-formats.
5. A pure-number choice like `$-4$` — still renders bare (not italicized).
6. Single-variable spans `$x$`, `$y$`, `$G$` — still italic.

No DB / backend / config changes. Single file edit.
