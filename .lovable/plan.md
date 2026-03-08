

## Add Image Cropping to Question Editor

### What We're Building
An inline image cropping tool that lets admins crop/resize images (both main question images and answer choice images) before uploading them to storage. This appears as a modal when an image is selected, letting the admin adjust the crop area before confirming.

### Technical Approach

1. **Install `react-image-crop`** — lightweight, well-maintained cropping library
2. **Create `ImageCropper` component** (`src/components/admin/questions/ImageCropper.tsx`)
   - Dialog-based UI with the crop area
   - Aspect ratio lock toggle (free, 16:9, 4:3, 1:1)
   - "Crop & Use" / "Cancel" buttons
   - Uses Canvas API to generate a cropped `File` from the selection
3. **Integrate into `QuestionForm.tsx`** and **`CBQuestionForm.tsx`**
   - When admin selects a main image → open cropper dialog → on confirm, set the cropped file as `imageFile`
   - When admin selects a choice image (A/B/C/D) → open cropper → on confirm, set cropped file for that choice
   - Existing preview and upload logic stays the same — just receives a pre-cropped file
4. **Also integrate into `EnglishQuestionImport.tsx`** if it has image uploads (will check during implementation)

### Files to Create/Modify
- **New**: `src/components/admin/questions/ImageCropper.tsx`
- **Modified**: `src/components/admin/questions/QuestionForm.tsx` — wire cropper into image selection handlers
- **Modified**: `src/components/admin/questions/CBQuestionForm.tsx` — same wiring
- **New dependency**: `react-image-crop`

No database changes needed.

