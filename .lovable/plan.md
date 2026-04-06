

# Fix Math Formatting in 150 Hard Question Set

## Problem
The 150 Hard questions store math expressions in **plain text** (e.g., `n^(3/2)`, `3x^2`, `√3/2`, `f(x) = 64(16)^x`) rather than LaTeX-delimited `$...$` format. The `MathText` component only renders content inside `$...$` as formatted math — everything else passes through as raw text. So students see ugly strings like `n^(3/2)` instead of properly rendered exponents and fractions.

Out of 150 questions: only 6 contain `$` signs (and those are actually dollar amounts like "$96", not LaTeX). About 20 questions have math expressions using `^`, `√`, `∛`, superscript unicode, etc.

Answer choices have the same issue — options like `√3/2`, `(7r-13)/3`, `f(x) = 64(16)^x` appear as raw text.

## Approach
Enhance the `MathText` component to **auto-detect and render common plain-text math patterns** as formatted KaTeX, even when they're not wrapped in `$...$`. Also improve the overall visual styling of rendered math.

This is better than a database migration because:
- It fixes all existing AND future questions automatically
- No risk of corrupting question data
- Works across all question sets, not just the 150

## Changes

### 1. Enhance `MathText.tsx` — Auto-detect plain-text math patterns

Add a pre-processing step that identifies common math patterns in plain text and wraps them in LaTeX before rendering:

- **Exponents**: `x^2`, `x^(3/2)`, `16^(x+1)` → `$x^{2}$`, `$x^{\frac{3}{2}}$`, `$16^{x+1}$`
- **Unicode math**: `√3`, `∛(a⁵)`, superscript characters → proper LaTeX `$\sqrt{3}$`, `$\sqrt[3]{a^5}$`
- **Fractions in context**: `√3/2` → `$\frac{\sqrt{3}}{2}$`
- **Function notation**: `f(x) = 64(16)^x` → rendered as math expression
- **Dollar amounts**: Preserve `$96`, `$218` as literal text (not LaTeX)

Key detection heuristics:
- Contains `^` with variables/numbers nearby → math expression
- Contains `√` or `∛` → math expression
- Expressions like `(number/number)` after `^` → exponent with fraction
- Variable names followed by operators → math context

### 2. Improve KaTeX visual styling in `index.css`

Add custom CSS to make rendered math blend better:
- Slightly larger math font size relative to surrounding text
- Better vertical alignment of inline math
- Consistent spacing around rendered expressions
- Ensure math doesn't look "floaty" next to regular text

### 3. Polish question card typography in `StudentQuestion.tsx`

- Improve the question text area with better line-height and letter-spacing
- Add slightly more padding around answer choices for readability
- Ensure math in answer choice buttons renders at the right size

## Files to modify
1. `src/components/MathText.tsx` — Add auto-detection preprocessing + improve rendering
2. `src/index.css` — Add KaTeX visual polish styles
3. `src/pages/StudentQuestion.tsx` — Minor typography improvements for question display

