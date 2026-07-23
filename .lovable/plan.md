## Goal

Make "Create custom question" the default/primary way to add questions to a practice-test module. Browsing the existing bank becomes secondary. Remove the difficulty field from the custom adder.

## Changes

**`src/pages/admin/BluebookModuleEditor.tsx`**
- Restructure the right side to two tabs: **Create** (default) and **Browse bank** (secondary).
- Main area still shows the module's current ordered question list on the left.
- Remove the Difficulty filter from the Browse tab sidebar (Section locked, Month, Year, Variant remain). Difficulty was noted only for Browse; the custom form does not have a difficulty field.

**`src/components/admin/bluebook/BluebookQuestionSelector.tsx`** (or wherever the custom adder form lives — reuse the same form component)
- Extract/render the custom-question form inline in the Create tab (not a modal).
- Fields: stem, choice A–D (or fill-in), correct answer, image/SVG (optional), explanation (optional). No difficulty field.
- On submit: create the question, auto-append it to the current module, clear form, show it in the left list, keep the tab on Create for rapid entry.

## Flow after change

1. Admin opens module editor → sees Create form on the right, module list on the left.
2. Type stem + choices + answer → **Add** → question appears in the module list; form resets.
3. To pull from existing bank, switch to **Browse bank** tab.

## Out of scope

- No DB schema changes.
- No changes to how questions are stored or to the module ordering logic.
- Browse-bank behavior unchanged except for removing the Difficulty filter.
