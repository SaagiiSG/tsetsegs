# UI architecture
- Admin sidebar sections are controlled by route-aware expansion and remain available as icons when collapsed, so navigation cannot hide the current page or strand users.
- Admin appearance uses a lifecycle-scoped body theme with semantic tokens so portalled dialogs inherit it without changing student or teacher pages.
- Institution customer tracking and payment dues are admin-only records independent of competition cohorts; they do not grant tenant access or provision subdomains.
- Institution customer lists and payment dues use paginated reads and shared query invalidation so dashboard summaries stay consistent after edits.
- Admin navigation uses one lightweight translucent material with reduced-transparency/contrast fallbacks; data surfaces stay solid to preserve legibility and avoid stacked blur costs.
- Admin atmospheric lighting is a semantic, navigation-only background layer with a solid accessibility fallback, so reference-inspired effects never reduce data contrast.- Course-center portals live in separate `tenant_*` tables scoped by `institution_id` and resolved from the `<slug>.flowersos.co` host (preview-only `?center=` override), so center data can never leak into the main Mongolian/intl cohorts, leaderboards or teacher views.
