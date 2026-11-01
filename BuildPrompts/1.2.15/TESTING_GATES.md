# Six gates for this frontend release

Prepared October 30, 2026. **Execution update: local gates 1–5 completed with evidence; gate 6 awaits the user’s production rollout.** See [actual results and limits](evidence/execution.md). Prototype validation and prior completed production acceptance are reference material; the new application evidence is recorded separately.

The implementation agent should automate and consolidate these checks. Ask Tyler only for the actual local design/release review and the necessary Portal actions. Do not turn each bullet into a separate screenshot request. Repeat a passed gate only after a relevant change or concrete failure.

## 1. Route and content behavior

Check anonymous direct entry, refresh, shared-header links, URL/title/H1/current-page agreement, and browser Back/Forward for all six marketing routes. Confirm unknown routes remain 404 and existing workspace/member routes still resolve through their intended access checks. Check all CTA/footer/sample links and image decoding.

Exercise both weekly examples, both AI examples, both tour audiences/all five screens, full-size image links, differentiation/context disclosures, and all FAQs. Verify no writes or live AI/provider requests are made by marketing interactions. Match the approved corrected copy and source/fictional-data labels; strip research-only UI language.

Test the complete legacy fragment map, including initial direct load, Back behavior, detailed/before selections, unknown fragments, and preservation of the unrelated real account flow.

## 2. Visual, responsive, and accessibility review

Compare real application captures to final mockup screenshots. Check 1440×900, 1366×768, 1280×800, 1101px/1100px around the menu breakpoint, 1024px, 800px, 390×844, and 320×568. Measure default page height and overflow; investigate material growth beyond the approved references. Expanded details may legitimately grow.

Check keyboard navigation, visible focus, one main/H1, skip link, disclosure state, no hidden focusable menu items, Escape/focus return, active page on account actions, menu reset on route changes, and mobile example shortcuts below the sticky header. Test enlarged text/browser zoom and reflow without clipping; a reduced-width screenshot alone is not a complete zoom test.

Run the existing axe tooling against each main page at desktop/mobile widths. Record actual results and any unresolved findings. Automated checks do not establish full accessibility conformance. Keep useful text next to screenshots so the image itself is not the only explanation.

## 3. Real account and application regression

Use the existing isolated local E2E fixture and identity provider. Verify real team entry and member entry still follow the current contracts, sign-in preserves safe return targets/access modes, logout remains real, sample-study reflection still behaves honestly, and existing signed-in workspace/member screens retain their layout. Keep the current onboarding/invitation/continuation assertions in `frontend/e2e/public-site.spec.ts` unless the actual contract intentionally changes—which is not planned here.

Scope remains navigation/presentation. Do not repeat production AI generation, study approval/publication, database restore, scheduling, old-cookie replay, eight-hour expiry waiting, worker interruption, or alert tests merely to accept the marketing release.

## 4. Public indexing and private isolation

With a production configuration, inspect rendered titles/descriptions/canonicals/robots for each new page, plus `/robots.txt` and `/sitemap.xml`. Confirm the new allowlisted public routes are discoverable, the existing approved public routes remain, and no private church/member/account/workspace paths appear in the sitemap. Confirm local/unconfigured-origin output stays nonindexable.

Check representative private cache/indexing headers and the existing `/api/v1/:path*` rewrite. Do not copy the research `noindex,nofollow` meta onto every production marketing page or broaden public indexing to all routes.

## 5. Local build and release artifact

Run relevant frontend checks from the workspace root, checking each result before proceeding:

```powershell
npm run lint --workspace=@gather/frontend
npm run typecheck --workspace=@gather/frontend
npm run test:unit --workspace=@gather/frontend
```

Run the updated public-site browser suite with the existing isolated stack:

```powershell
npx playwright test frontend/e2e/public-site.spec.ts
```

Add/use a focused navigation spec if the new cases warrant it, and run that as well. Preserve existing assertion strength; direct this version’s new captures to its own evidence folder. Use installed browsers and existing dependencies. If a failure comes from unrelated baseline behavior, record the evidence and its relevance rather than describing it as passed or expanding into an unrelated repair project.

Complete a production build; the final Docker frontend build also exercises `next build`. Smoke the built container’s public routes and production discovery files locally. Record exact commands/results, image ID/platform, build-time origin/backend settings, and how the release source was identified. Use the actual candidate image for this evidence. Do not claim local production-image proxy access passes if the Azure-internal API hostname is unavailable from the local container; real integration is covered by the isolated stack and final real-domain smoke check.

## 6. Short production smoke check

Run only after Tyler performs the approved Portal rollout. Prefer one read-only scripted batch plus a single combined visual/login confirmation:

1. New frontend revision becomes ready; correct image and intended traffic serve the main domain.
2. Six public routes respond with the expected page/title, navigation works, and a representative old section link reaches its new page. Check mobile header and one interaction of each type. Review new revision errors.
3. Production canonical/robots/sitemap output and public image assets are correct; `/api/v1/auth/options` returns the expected production options (`localIssuer=false`, `demoLogin=false`, `accessBasedLogin=true`).
4. Existing real contributor/member entry and a published member study remain accessible with the appropriate existing accounts. Reuse a valid session when available; do not create extra production churches/accounts or edit/publish a study for this check.

Record results once. On a material failure, use the frontend rollback steps and recheck affected behavior. Do not relabel the prior 35-check acceptance as pending.
