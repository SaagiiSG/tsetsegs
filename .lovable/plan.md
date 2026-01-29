
# Desmos-Style Math Editor for Question Creation

## Overview

Build a WYSIWYG math editor that mirrors Desmos's input experience - where teachers can type naturally and math automatically transforms into beautiful formatted equations. This replaces the current plain-text LaTeX approach with a live, visual editing experience.

## How Desmos Input Works

When you type in Desmos:
- `/` after something creates a fraction with cursor ready in numerator
- `sqrt` transforms into a square root symbol with cursor inside
- `Shift+6` (^) moves cursor up for exponents
- `_` moves cursor down for subscripts
- `pi`, `theta`, `alpha` auto-convert to Greek symbols
- Arrow keys navigate between parts of expressions naturally

## Solution: MathQuill Integration

**MathQuill** is the exact library that powers Desmos's calculator. It's maintained by the Desmos team themselves and provides all the behaviors your teachers are already familiar with.

### Key Features We'll Enable

| Typing This | Auto-Converts To |
|-------------|------------------|
| `1/2` | Fraction ½ with cursor flow |
| `sqrt` | √ with box for content |
| `x^2` | x² with proper superscript |
| `x_n` | xₙ with proper subscript |
| `pi`, `theta`, `alpha` | π, θ, α |
| `sin`, `cos`, `log` | Properly formatted operators |
| `sum`, `int` | Σ, ∫ with bounds |

## Technical Implementation

### Phase 1: Core MathQuill Component

**New File: `src/components/admin/questions/MathQuillEditor.tsx`**

A reusable React component wrapping MathQuill with:
- Desmos-identical keyboard shortcuts
- LaTeX output for database storage
- Dark mode support
- Customizable height/placeholder

Configuration matching Desmos behavior:
```text
+-------------------+------------------------------------------+
| autoCommands      | pi theta sqrt sum prod int alpha beta... |
+-------------------+------------------------------------------+
| autoOperatorNames | sin cos tan log ln exp...                |
+-------------------+------------------------------------------+
| spaceBehavesLikeTab        | true (space exits blocks)       |
+-------------------+------------------------------------------+
| leftRightIntoCmdGoes       | 'up' (Desmos-style navigation)  |
+-------------------+------------------------------------------+
| supSubsRequireOperand      | true (prevents x^^2 typos)      |
+-------------------+------------------------------------------+
| charsThatBreakOutOfSupSub  | '+-=<>'                         |
+-------------------+------------------------------------------+
```

### Phase 2: Hybrid RichTextEditor

**Modify: `src/components/admin/questions/RichTextEditor.tsx`**

The math editor needs to work alongside regular text (for question stems like "If x = 5, what is..."). Options:

**Approach A - Inline Math Blocks:**
- Keep text editor, add "Insert Math" button that opens MathQuill inline
- Similar to current but with live editing instead of raw LaTeX

**Approach B - Full MathQuill (Recommended for Math Questions):**
- Provide a dedicated MathQuillEditor for pure math expressions
- Use in answer choices where content is primarily mathematical

### Phase 3: Integration Points

**Modify: `src/components/admin/bluebook/BluebookQuestionSelector.tsx`**
- Replace question text and answer choice editors with MathQuill-enabled versions
- Output remains LaTeX-compatible for existing rendering pipeline

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/admin/questions/MathQuillEditor.tsx` | Create | Core Desmos-style editor |
| `src/components/admin/questions/RichTextEditor.tsx` | Modify | Add inline MathQuill blocks |
| `src/components/admin/bluebook/BluebookQuestionSelector.tsx` | Modify | Use new editors for custom questions |
| `src/index.css` | Modify | MathQuill styling + dark mode |
| `package.json` | Modify | Add `react-mathquill` dependency |

## User Experience

**Before (Current):**
```text
Type LaTeX manually: "\frac{x^2 + 1}{2}"
Click "Preview" to see result
```

**After (Desmos-style):**
```text
Type naturally: "x^2+1" then "/" then "2"
See fraction appear live as you type ─┐
                                       │
    x² + 1                             │
    ──────   ◄─────────────────────────┘
      2
```

## Dependencies

- **`react-mathquill`**: React wrapper for MathQuill (~25KB gzipped)
- Uses existing `katex` for rendering in student-facing views (no change needed)

## Backward Compatibility

- Stored format remains LaTeX strings (compatible with existing `MathText` component)
- Existing questions will continue to render correctly
- Students see no change - same beautiful KaTeX rendering
