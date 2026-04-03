

## Fix Browser Tab Title

The `<title>` tag in `index.html` currently shows the raw project ID (`b17aa099-0564-465a-8bde-ea42ea79d257`) instead of a proper name. The OG meta tags have the same issue.

### Changes

**`index.html`** — Update these lines:
- `<title>` → something like "Tsetsegs SAT Prep" (or whatever brand name you prefer)
- `<meta property="og:title">` → same brand name
- `<meta property="og:description">` → a proper description like "SAT preparation platform"
- `<meta name="description">` → same

This is a single-file, 4-line change.

