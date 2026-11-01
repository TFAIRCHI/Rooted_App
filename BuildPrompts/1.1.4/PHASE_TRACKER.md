# Rooted Build Request 1.1.4 — Phase Tracker

**Status:** Complete; user requested these updates on 2026-10-19.

| Gate | Status | Evidence |
|---|---|---|
| G1 Church name editing | Complete | `backend/src/api/core-routes.ts` accepts validated `name` updates only with `settings:manage`; Settings editor reloads the updated workspace identity |
| G2 Admin logo access and strategic placement | Complete | Existing admin-authorized logo pipeline retained; active logo appears in staff navigation and public member brand banner |
| G3 Rooted/product-versus-tenant identity | Complete | Rooted remains the product mark; editable church name is tenant identity; tagline and fallback branding remain intact |
| G4 Testing and regression | Complete | Typecheck, lint, unit (44), integration (32), build, and E2E (6) passed |

## Testing gate evidence

- `npm run typecheck` — passed; contract hash verified.
- `npm run lint` — passed.
- `npm run test:unit` — passed: 13 frontend, 27 backend, 4 operations.
- `npm run test:integration` — passed: 32 tests.
- `npm run build` — passed for frontend and backend.
- `npm run test:e2e` — passed: 6 browser scenarios, including admin church-name editing, logo upload/theme activation, and member rendering.
