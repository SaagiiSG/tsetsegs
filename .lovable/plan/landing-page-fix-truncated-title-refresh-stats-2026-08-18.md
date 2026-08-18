# Landing page: fix truncated title + refresh stats

## 1. "Master the SAT" renders as "Master the S"

Cause (confirmed by reading the code): the animated headline splits text into one `<span>` per character keyed by index, and it only animates once (`hasAnimated` guard). When the language toggle switches MON ("SAT-ыг эзэмш", 12 chars) to ENG ("Master the SAT", 14 chars), React reuses the first 12 spans — those already have `opacity: 1` from the first animation — but the 2 extra spans are freshly created with inline `opacity: 0` and never animated, so the final two characters stay invisible.

Fix: make the split-text component re-run its reveal whenever `text` changes — reset the element list and the animated-once guard on text change, and animate immediately if the element is already in view (no new scroll event will fire). This also fixes any other language-toggled headline that gets longer.

## 2. Copy and stat updates

- Smart Practice feature description: "68+ unique problems" becomes "2,600+ unique problems", and mention "300 video lessons". MON version updated to match.
- Avg Math Score stat: 700+ becomes 680, with the percentile shown under it. SAT Math 680 sits at roughly the 89th percentile nationally, so the label reads "Avg Math Score — 89th percentile" (MON: "89-р хувь").
- Students stat: label changes from "Students Trained" to "Active Users" (MON: "Хэрэглэгчид"), value stays 1000+.

## Technical notes

- `src/components/reactbits/SplitText.tsx` — re-animate on `text` change; clear stale span refs; handle already-visible case.
- `src/pages/Index.tsx` — `translations.mon` / `translations.eng` copy edits, `stats` array value change (700 -> 680, drop the "+" suffix on the score), percentile sub-label rendering in the stats block.
- No backend or data changes.
