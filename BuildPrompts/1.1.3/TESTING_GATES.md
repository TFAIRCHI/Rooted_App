# Rooted 1.1.3 Testing Gates

Every gate must pass completely before the next phase is accepted.

| Gate | Scope | Required evidence |
|---|---|---|
| G0 | Baseline and design contract | 1.1.2 tests pass; token map, upload limits, supported formats, storage contract, and accessibility policy documented |
| G1 | Secure logo asset lifecycle | Authorized upload, signature/type validation, byte/pixel limits, normalization, metadata stripping, digest caching, tenant isolation, safe serving, replacement, and failure cleanup tested |
| G2 | Palette extraction and semantic theme model | Deterministic extraction fixtures, candidate review, token validation, contrast checks, immutable revisions, preview-without-activation, reset, restore, and audit tested |
| G3 | Settings UX and object styling | Settings entry point works for permitted roles; empty/uploading/error/success states; live previews; staff/member surfaces; light/dark/system; responsive and keyboard flows verified |
| G4 | Regression and delivery quality | `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build`, and `npm run test:e2e` pass; migration rerun/upgrade tests pass |

## Required negative tests

- Wrong file signature with an allowed extension.
- Disallowed SVG, animated image, oversized file, excessive dimensions, decompression bomb, and malformed image.
- Cross-tenant asset ID in upload, preview, activation, read, restore, and delete operations.
- Unauthorized member attempting theme mutation.
- Failed processing while an existing active theme is present.
- Concurrent activation with stale revision/ETag.
- Low-contrast action, focus, border, or text-on-surface combinations.
- Re-uploading the same digest does not create unnecessary duplicate derivatives.

No external storage, image CDN, or provider claim is considered verified without a real integration test or an explicitly marked fixture.
