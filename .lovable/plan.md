## Goal

Let admins upload a source PDF while creating custom questions inside a bluebook module. The PDF opens in a floating, resizable, edge-snapping window with page nav, zoom, search, and select-to-copy — persisted per module so any admin editing the same module sees it auto-load.

## UX

- New "Reference PDF" button in `BluebookModuleEditor` header (next to Create/Browse tabs).
- First click → upload dropzone (drag/drop or file picker, max ~30MB).
- Once uploaded, a floating window appears over the editor:
  - Draggable by title bar, resizable from corners
  - Snap zones: left half, right half, top half, bottom half (iPadOS split-view style) — highlight overlay while dragging near an edge, release to snap
  - Minimize to a small draggable pill (like the challenge HUD), restore on click
  - Close button clears local view state only — PDF stays saved on the module
  - Position/size/snap state persisted in `localStorage` per admin
- Toolbar: page prev/next, page number input, zoom −/+/fit, search (Ctrl+F opens input, highlights matches, next/prev), "Copy selection to passage" button (inserts selected PDF text into the currently focused question field: passage, prompt, or explanation)

## Storage & data

- New public storage bucket `module-pdfs` (RLS: admins read/write, authenticated read).
- New columns on `bluebook_modules`:
  - `reference_pdf_path text`
  - `reference_pdf_name text`
  - `reference_pdf_uploaded_at timestamptz`
- Upload flow: `module-pdfs/{moduleId}/{uuid}.pdf` → update module row. Replace overwrites row + best-effort deletes old object.

## Rendering

- Use `pdfjs-dist` (already common; add if missing) with the worker loaded from a bundled URL — no external CDN.
- Fetch PDF via signed URL from the bucket (or public URL since admin-only editor).
- Render current page to a `<canvas>`; overlay a transparent text layer using pdf.js `TextLayerBuilder` output so selection + search highlighting work.

## Files

New:
- `src/components/admin/bluebook/ReferencePdfViewer.tsx` — floating window, drag/resize/snap, toolbar, pdf.js render + text layer + search
- `src/components/admin/bluebook/ReferencePdfUpload.tsx` — dropzone + upload handler
- `src/hooks/useReferencePdf.ts` — loads module row, uploads, updates path
- `src/lib/pdfjs.ts` — pdf.js setup with local worker

Modified:
- `src/pages/admin/BluebookModuleEditor.tsx` — add toggle button, mount viewer, expose "insert selection" callback to `CustomQuestionForm`
- `src/components/admin/bluebook/CustomQuestionForm.tsx` — accept `insertTextIntoActiveField` ref so the viewer's "copy to question" targets the last-focused textarea (passage/prompt/explanation)

## Migration

1. `create bucket module-pdfs (public=false)` via storage tool
2. Migration:
   - `alter table public.bluebook_modules add column reference_pdf_path text, reference_pdf_name text, reference_pdf_uploaded_at timestamptz;`
   - RLS on `storage.objects` for bucket `module-pdfs`: select/insert/update/delete restricted to `has_role(auth.uid(),'admin')`.

## Snap logic (technical)

- Track pointer during drag; when within 40px of a screen edge, show a translucent preview rect for that half. On drop inside a zone, animate window to that rect (`left|right|top|bottom half`). Otherwise, free-position.
- Sizes persisted: `{ mode: 'free'|'left'|'right'|'top'|'bottom'|'min', x, y, w, h }` in `localStorage` under `admin:module-pdf:viewer`.

## Out of scope

- Annotations / highlighting saved back to PDF
- Multi-PDF per module (single reference for now)
- Mobile layout tuning beyond "it still opens"
