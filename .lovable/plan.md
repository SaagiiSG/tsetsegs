

## Insert 316 Math Vocabulary Words + Add Reference Images Section

### What's Wrong
The `vocabulary_words` table has 325 English words but **0 math words**. The math tab shows empty because there's nothing in the database with `subject = 'math'`.

### Plan

**Step 1: Insert all 316 math words into the database**

Use a script to batch-insert all 316 entries parsed from the PDF into `vocabulary_words` with `subject = 'math'`. Key data cleaning:
- Remove "Tsetsegs SAT сургалт" artifacts (entries #6, #45, #90, #124)
- Entry #116: "Which of the following statements best describes" (full phrase)
- Entry #221/223 (Domain/Range): condense multi-line definitions
- Entry #233: "Roots, zeros, solutions" combined
- Entry #236/237: "Function transformations" combined
- Entry #241: add "Units / Нэгж" as sub-entry #241
- Entry #254 "Quotient": add Mongolian "Ноогдвор"
- Entry #258: "Absolute Value" combined from split lines
- Entry #270: "Regular polygon" (clean formatting)
- Entry #294: "Figure not drawn to scale" (clean formatting)
- Entry #310: "The margin of error" (clean multi-line definition)
- Entry #311: "Confidence interval" (clean OCR artifacts)

**Step 2: Add a "Reference Images" section to the Math vocabulary tab**

The PDF contains 3 reference diagrams (slope formula, quotient/divisor/dividend layout, confidence interval formula). These will be:
- Copied to the `question-images` storage bucket as reference images
- Displayed in a collapsible "Reference Diagrams" section at the top of the math vocabulary tab
- Shown as thumbnail cards that expand on tap

### Technical Details

- **Database**: ~316 INSERT statements into `vocabulary_words` via a migration or exec script
- **Storage**: Upload 3 images to `question-images` bucket under a `math-reference/` prefix
- **UI change**: Add a collapsible reference images section in `StudentVocabulary.tsx` that only appears when `vocabType === 'math'`
- No schema changes needed — the `vocabulary_words` table already supports `subject = 'math'`

### Files to Modify
- **Script**: Insert 316 math words into database
- **Upload**: 3 reference images to storage
- `src/pages/student/StudentVocabulary.tsx` — Add reference images section for math tab

