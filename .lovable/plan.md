
# Clean Up Defective Questions + Add Image-Based Answer Choices

## Part 1: Database Cleanup

### Remove Defective Questions
There are **4 defective CollegeBoard questions** that have placeholder/broken answer choices:

| Question ID | Issue |
|---|---|
| CB0351 | All 4 choices are `[Graph A]`, `[Graph B]`, etc. (no actual content) |
| CB0370 | Choices C and D are `[UNCLEAR]` |
| CB0389 | All 4 choices are `[Graph A]`, `[Graph B]`, etc. |
| CB0431 | Choices A and B are `[UNCLEAR]` |

Additionally, **CB0002** was flagged by a student as defective.

**Action:** Set `is_active = false` on all 5 questions to remove them from student practice while preserving attempt history.

---

## Part 2: Add Image Support for Answer Choices

Some questions have graphs, tables, or figures as answer options (not just the question itself). The current system only supports text-based answer choices. We need to support image URLs per choice.

### Database Schema Change
Add a new column to the `questions` table:

```text
choice_images JSONB (nullable, default null)
```

Structure: `{"A": "https://...image_url", "B": "https://...image_url", "C": null, "D": null}`

This keeps it flexible -- any combination of text + image per choice is supported. If a choice has an image, it renders the image; if it also has text, both show.

### Admin Form Updates (CBQuestionForm.tsx + QuestionForm.tsx)

For each answer option (A, B, C, D), add an optional image upload button next to the text editor:

- Each choice gets an "Upload Image" icon button beside the text input
- When an image is uploaded, it shows a thumbnail preview with a remove button
- Images are uploaded to the existing `question-images` storage bucket under `choices/` subfolder
- On save, the `choice_images` JSON object is constructed from any uploaded images

**Changes to forms:**
1. Add state for 4 choice image files + 4 choice image previews
2. Add image upload UI inline with each A/B/C/D option
3. On form load (edit mode), populate previews from existing `choice_images`
4. On save, upload any new choice images, then save the `choice_images` JSON

### Student Question Rendering (StudentQuestion.tsx)

Update the multiple choice rendering (lines 854-876) to:

1. Check if `choice_images` exists for the current question
2. If a choice has an image URL in `choice_images`, render an `<img>` tag inside the choice button
3. The image appears above the text (if text exists), or alone if text is just a placeholder
4. Images get the same styling as the question image (rounded, bordered, contained)

### Live Preview in Admin Form

The right-side preview panel in both forms also needs to render choice images so admins can see what students will see.

---

## Technical Details

### Migration SQL
```text
ALTER TABLE questions ADD COLUMN choice_images JSONB DEFAULT NULL;
COMMENT ON COLUMN questions.choice_images IS 
  'Optional image URLs for answer choices. Format: {"A": "url", "B": "url", "C": "url", "D": "url"}';
```

### Files to Modify
1. **Database migration** -- add `choice_images` column
2. **src/components/admin/questions/CBQuestionForm.tsx** -- add per-choice image upload UI + save logic
3. **src/components/admin/questions/QuestionForm.tsx** -- same per-choice image upload UI
4. **src/pages/StudentQuestion.tsx** -- render choice images in the answer buttons
5. **src/pages/student/StudentEnglishQuestion.tsx** -- render choice images there too (if applicable)

### Execution Order
1. Deactivate the 5 defective questions (data update)
2. Run the schema migration to add `choice_images`
3. Update CBQuestionForm with per-choice image uploads
4. Update QuestionForm with per-choice image uploads
5. Update StudentQuestion to render choice images
