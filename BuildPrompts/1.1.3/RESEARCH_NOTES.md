# Research and Technical Plan

## Current-state findings

- `frontend/components/theme-settings.tsx` currently edits `mode`, `primary`, `accent`, and `surface` as hex values.
- `backend/migrations/007_rooted_theme.sql` stores the theme as JSON on `churches`.
- `GET/POST /churches/:churchId/settings` already performs tenant and capability checks and audits theme changes.
- `frontend/components/workspace.tsx` currently maps theme values to a small set of CSS variables; member pages do not yet receive a complete theme asset/token set.
- `@fastify/multipart` is already installed in the backend, reducing upload implementation cost.

## Recommended architecture

### Upload and processing

Use a bounded multipart upload endpoint. Accept PNG, JPEG, and WebP for MVP; do not accept SVG until a separate sanitization decision is approved. Validate the declared type and the decoded file signature, enforce size and pixel limits, generate a server-owned object key, strip metadata, and re-encode normalized derivatives. Store the original only if there is a documented retention need; otherwise retain normalized logo variants and a digest.

Recommended derivatives:

- `logoMark`: transparent, square-safe variant for compact navigation.
- `logoLockup`: contained horizontal variant for headers and member pages.
- `logoPreview`: bounded preview for settings.

Use object storage behind an application-controlled URL or signed URL. Do not expose tenant filesystem paths. The existing local filesystem/mock provider can be used for development, but the storage interface should be provider-neutral.

### Palette extraction

Extract candidate colors from the normalized logo server-side or in a bounded worker. The algorithm should downsample, ignore transparent pixels, reduce near-duplicates, and return named candidates with confidence and provenance. The result is a suggestion, not an automatic publication. A simple deterministic color quantization implementation is acceptable for MVP; a third-party palette library is optional and must be evaluated for bundle size, licensing, and maintenance.

Suggested palette roles:

```json
{
  "brand": "#177569",
  "brandStrong": "#105a51",
  "accent": "#ae813e",
  "pageSurface": "#f6f4ee",
  "panelSurface": "#fffefa",
  "navSurface": "#142e3b",
  "actionSurface": "#177569",
  "focusRing": "#bf8b36",
  "textOnBrand": "#ffffff",
  "textOnSurface": "#243e49",
  "border": "#dedfd7"
}
```

The exact token names may evolve, but they must be semantic and object-oriented rather than raw `primary`/`accent` only.

### Theme revision model

Keep the active theme tenant-scoped and add immutable revisions rather than overwriting the only historical value. A revision should include the logo asset references, extracted palette, accepted/edited tokens, mode behavior, actor, timestamp, and source digest. The active pointer changes atomically after validation. Failed processing must not alter the active theme.

### Object styling

Replace scattered hard-coded colors with semantic CSS variables such as `--theme-page-surface`, `--theme-panel-surface`, `--theme-nav-surface`, `--theme-action`, `--theme-action-hover`, `--theme-accent`, `--theme-border`, and `--theme-focus`. Apply them to:

- sidebar and top navigation;
- cards, date cards, panels, and reading surfaces;
- primary/secondary buttons and hover/active states;
- badges, status chips, links, dividers, focus rings, and decorative marks;
- staff logo lockup and member reading header;
- member study preview and discussion/reaction surfaces.

Text colors should be derived from surface contrast, with explicit validation against the project’s accessibility target. Do not use a logo’s darkest color indiscriminately as a text color.

## API proposal

```text
POST /api/v1/churches/:churchId/theme/logo
Content-Type: multipart/form-data
Capability: theme:manage or settings:manage
Input: one bounded PNG/JPEG/WebP file
Output: asset id, normalized variants, digest, extracted palette candidates, processing status

POST /api/v1/churches/:churchId/theme/preview
Capability: theme:manage or settings:manage
Input: asset id, selected palette candidate, token overrides, mode
Output: validated preview theme; no active-theme mutation

POST /api/v1/churches/:churchId/theme
Capability: theme:manage or settings:manage
Input: asset id, accepted palette, semantic token overrides, mode, expected active revision
Output: active theme revision and URLs/identifiers for normalized logo variants

GET /api/v1/churches/:churchId/theme
GET /api/v1/churches/:churchId/theme/revisions
```

The existing settings endpoint may remain as a compatibility read/write surface during migration, but the new theme contract must reject unknown token names and enforce tenant ownership for asset IDs.

## Security and privacy

- Authorization must be checked before upload, preview, revision read, replacement, and delete.
- Validate decoded content, not only filename or `Content-Type`; generate filenames and object keys server-side.
- Bound bytes, dimensions, pixel count, processing time, and decompression work.
- Strip EXIF/GPS metadata during normalization.
- Re-encode to safe output formats and serve with correct content type, `Content-Disposition`, and `X-Content-Type-Options: nosniff`.
- Never render uploaded SVG, HTML, or CSS as executable content in MVP.
- Audit upload, extraction, preview, activation, replacement, and failed processing.
- Define retention and deletion behavior for replaced logos and tenant deletion.

These controls are supported by the OWASP File Upload guidance [S1], the browser file-input guidance [S2], and the image metadata/resize capabilities documented by Sharp [S3].

## UX screens to design/build

- Existing Settings page entry card.
- Empty state: no logo, Rooted fallback mark, upload action.
- Uploading/processing state with progress and cancel behavior.
- Invalid, oversized, unsupported, and processing-failed states.
- Logo preview with light/dark previews and crop/contain choice.
- “Suggested from your logo” palette candidates.
- Object-style controls grouped by page objects, not typography.
- Live staff/member preview with reset-to-suggestion and discard controls.
- Save confirmation, revision history, restore previous theme, and replacement-logo flow.
- Mobile responsive behavior and keyboard/screen-reader labels.

## Alternatives and recommendation

| Option | Benefits | Costs/Risks | Decision |
|---|---|---|---|
| Browser-only extraction and upload | Fast feedback, less server work | Untrusted client result, inconsistent processing, hard to audit | Use only for optimistic preview, never as authority |
| Backend extraction with normalized assets | Deterministic, auditable, secure, reusable derivatives | Adds processing and storage work | Recommended |
| External brand/image service | Mature transformations and CDN | Vendor cost, tenant data transfer, lock-in, provider dependency | Defer until scale justifies it |

## Efficiency plan

1. Keep one logo and one active theme revision per church in MVP.
2. Process once, cache by SHA-256 digest, and reuse existing derivatives if the same image is uploaded again.
3. Perform small uploads synchronously with strict limits; move larger/slow processing to the existing worker queue.
4. Return palette candidates with the upload response so the user can review without a second extraction request.
5. Use CSS variables and semantic tokens so changing a theme does not require component-by-component data refetching.
6. Lazy-load logo derivatives and use bounded dimensions to keep member pages fast.

## Implemented MVP storage decision

For this local/MVP implementation, normalized logo derivatives are stored as bounded PostgreSQL `bytea` values in the tenant-scoped `theme_assets` table. This is intentionally smaller than a general media system and avoids introducing an unverified production object-storage provider during this slice. The schema and route boundary keep the asset contract provider-neutral so a later migration can move bytes to object storage without changing theme revisions or tenant authorization.

## Open questions

- Should churches be allowed to upload a transparent logo only, or also a photographed sign/hero image?
- Is logo deletion required in MVP, or only replacement and restore?
- Should the logo appear on SMS landing pages, or only web surfaces?
- Which object tokens should be editable versus derived and locked for accessibility?
- What production object-storage provider and retention policy will be selected?

## Sources

- **S1 — Verified, accessed 2026-10-19:** [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- **S2 — Verified, accessed 2026-10-19:** [MDN: `<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file)
- **S3 — Verified, accessed 2026-10-19:** [Sharp input metadata](https://sharp.pixelplumbing.com/api-input/) and [Sharp resize](https://sharp.pixelplumbing.com/api-resize/)
- **S4 — Reference target, accessed 2026-10-19:** [W3C WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
