# Rooted 1.2.10 — Traceability

All rows define proposed work, not completed implementation. Full evidence and source observations are in [research](../../research/24-church-member-home-and-figma-reference.md). Test IDs are in [testing gates](TESTING_GATES.md).

| User intent / requirement | Current source surface | Design/API contract | Phase / proof |
|---|---|---|---|
| Recreate post-login church member home from supplied Figma | `frontend/app/c/[slug]/page.tsx`; `frontend/app/c/[slug]/layout.tsx`; `frontend/components/member-navigation.tsx` | Figma frame is source of visual truth; reference must be accessible before coding | 0; R01–R04 |
| Show relevant current studies | `frontend/lib/member-server.ts`; `backend/src/api/core-routes.ts` `publishedResource` / `publishedStudies` | Selected-church live publication list only; no private/draft/history leaks | 1; H01–H03 |
| Preserve login and church context | `frontend/components/login-screen.tsx`; `frontend/app/[route]/page.tsx`; API session and return path | Server-resolved identity and membership; explicit church choice if ambiguous | 1; H04–H05 |
| Let member enter a study and interact | `frontend/app/c/[slug]/studies/[id]/page.tsx`; `frontend/components/member-conversation.tsx` | Existing detail, reactions, discussion policy, moderation retained | 1; H05, H07 |
| Match actual Figma without inventing features | `MEMBER_HOME_UX_SPEC.md`; screenshots captured in execution evidence | Visual token/layout inventory approved in Phase 0 | 0/2; R02, V01 |
| Responsive accessible home | `frontend/app/globals.css`; member shell and navigation | Semantic structure, focus, reflow, target sizing, contrast | 2; V02–V06 |
| Handle empty/error/loading | Member home and server reader | Distinct state contracts; retry does not switch church | 1; H06 |
| Render church dates correctly | Current member home date formatting; theme/tenant API if a zone is missing | Church IANA zone or canonical local date; no hard-coded zone | 1; H08 |
| Validate complete user journey and preserve app | `frontend/e2e`; root scripts and package validators | No weakening existing checks; record regression outputs and screenshots | 3; E01–E06 |

## Explicit non-goals unless Figma inspection and user approval expand scope

- Contributor dashboard or church-admin navigation redesign.
- Login/authentication system replacement, new role types, or permission changes.
- New read-progress/bookmark/member analytics model.
- Email/SMS/push delivery, announcement feed, or personalization engine.
- Backend migration or API addition without a documented contract gap.
