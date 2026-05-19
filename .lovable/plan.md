## The actual bug (root cause)

Your example `$y=\frac{1}{2}\left(11x+6\right)+4x$` is valid LaTeX. It fails because the current tokenizer in `src/components/MathText.tsx` has this rule:

```ts
const PROSE = /\s|\b[a-z]{2,}\b/;   // line 158
```

When it scans inside `$...$`, the words **`frac`**, **`left`**, **`right`** match `\b[a-z]{2,}\b` → the tokenizer concludes "this is English prose, the `$` is currency" → it dumps the raw LaTeX as text. Same for `\sqrt`, `\sin`, `\cdot`, `\pi`, `\cos`, etc. That's why *most* CB-imported questions break — they use `\left( \right)` / `\frac` heavily.

So the rewrite isn't just cosmetic; it's replacing a fundamentally wrong heuristic.

## New pipeline

A single new component `MathText` with this strict, predictable order:

```text
input string
   │
   ▼
1. Protect escaped dollars  \$  →  \uE000      (currency-safe)
   │
   ▼
2. Extract delimited math (in this order):
       $$ ... $$        → display math token
       \[ ... \]        → display math token
       $ ... $          → inline math token
       \( ... \)        → inline math token
   Each extracted span is replaced with a placeholder; everything
   else is text. No "prose vs math" guessing — delimiters win.
   │
   ▼
3. On remaining text only, run auto-detect for unicode/shorthand:
       x²,x³,xⁿ         → $x^{2}$ etc.
       √3, √(a+b)       → $\sqrt{3}$
       ∛8               → $\sqrt[3]{8}$
       π, ≤ ≥ ≠ ± × ÷   → $\pi$ etc.
       caret x^2, x^(n) → $x^{2}$
   Auto-detect output is itself tokenized into math spans.
   │
   ▼
4. Render:
       text  → light markdown (**bold**, *em*, ^sup^, ~sub~, \n→<br/>)
                + restore \uE000 back to "$"
       math  → katex.renderToString(..., { throwOnError:false,
                                          strict:'ignore',
                                          displayMode })
   KaTeX's own error-color span is shown on parse failure (no
   silent drop), so authors see what broke.
```

Key differences vs. today:
- **No prose heuristic.** If it's between `$...$`, it goes to KaTeX. Period.
- **Currency is opt-in via `\$`** (and we still auto-protect bare `$NN` only outside of detected math spans by running step 2 first — a bare `$96` with no closing `$` stays literal).
- **Supports `\(...\)` and `\[...\]`** so CB / external imports that use those delimiters work without re-migration.
- **`throwOnError:false`** — KaTeX renders partial output instead of vanishing, which makes broken questions visible to teachers instead of blank.
- **Auto-detect runs only on text, not inside math** — eliminates double-processing bugs.

## Files

**Rewrite (1):**
- `src/components/MathText.tsx` — full replacement, same export signature `MathText({ text, className })` so all 15 call sites keep working untouched.

**No changes needed at call sites:**
`StudentQuestion.tsx`, `LiveSession.tsx`, `StudentSpeedSession.tsx`, `StudentBluebookTest.tsx`, `QuestionBank.tsx`, `TeacherQuestionViewer.tsx`, `LiveQuestionControl.tsx`, `CBQuestionForm.tsx`, `FlaggedQuestions.tsx`, `QuestionForm.tsx`, `QuestionList.tsx`, `BluebookResultsDialog.tsx`, `TeacherFlaggedQuestions.tsx`, `BluebookQuestionSelector.tsx`.

**New (small):**
- `src/lib/mathText/extractMath.ts` — pure tokenizer (delimited extraction).
- `src/lib/mathText/autoDetect.ts` — unicode/caret shorthand → LaTeX.
- `src/lib/mathText/__tests__/mathText.test.ts` — regression fixtures covering:
  - `$y=\frac{1}{2}\left(11x+6\right)+4x$` ✅
  - `$\frac{1}{25}$` ✅
  - `$f\left(x\right)=240\left(x\right)^x$` ✅
  - `$$\begin{cases} x+y=1 \\ x-y=3 \end{cases}$$` (display)
  - `\(a^2+b^2=c^2\)` (paren delimiters)
  - `He spent $96 and earned $40.` → currency preserved
  - `\$5 off` → literal `$5 off`
  - `x² + √3 = π` → auto-detected
  - Geometry labels `$FGH$`, `$GH$` → italicized via KaTeX
  - Mixed: `The value $x^2$ when $x=3$ is 9.`

## Risk & rollout

- Same export signature → zero call-site churn.
- Side-by-side test page at `/dev/math-render` (route guarded to admins, removed before publish) where you can paste any DB question text and see old vs. new output. I'll seed it with the three failing examples plus ~10 from the CB import.
- After you visually approve, the old logic is deleted in the same commit.

## Out of scope

- No KaTeX → MathJax/MathLive swap (bundle hit, not needed for the bug).
- No DB content migration — new pipeline reads existing strings as-is.
- No changes to question authoring UI; that can be a follow-up once the renderer is stable.
- Memory note `Math rendering: MathText with KaTeX auto-formats...` will be refreshed after implementation to document the new delimiter-first contract.
