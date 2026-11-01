# Focused public-page navigation — frontend release

Prepared October 30, 2026. **Implemented and verified locally; image ready. Not uploaded or deployed.**

Review the actual frontend at **http://127.0.0.1:3081/**. It is the standalone production image. Public pages work locally; its Azure-internal API hostname is not connected from this preview. The real account journeys passed in the isolated local fixture.

## Prepared artifact

```text
rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:navigation-20261030-1
```

- Local image ID: `sha256:cada40492dd89414805358efc375b78ae0132142791b93e64a56183bb6de10f4`.
- Platform/user: `linux/amd64`, `node`.
- Proposed Portal suffix: `navigation-20261030-1`.
- [Execution evidence](../../BuildPrompts/1.2.15/evidence/execution.md): lint/typecheck, 52 frontend unit tests, nine passing browser journeys across recorded runs, 54 layouts, 18 main-page automated accessibility scans, and 72 production-image checks.
- No backend/worker release, database migration, identity-policy change, DNS change, or scaling change is required.

## 1. Review the real pages

Visit Home and the five topic pages using the shared header. Try the phone menu, weekly example, product tour, and AI example. The approved research remains in [Homepage Navigation Research](../../research/Homepage%20Navigation%20Research/README.md); this preview is the real application implementation.

## 2. Upload with local Docker

After the actual candidate is accepted for release, run:

```powershell
docker push rootedtogethercr-dudpd0aebzeqewa2.azurecr.io/rooted-frontend:navigation-20261030-1
```

Use the existing private Docker registry login. Record the returned remote manifest digest. Do not confuse it with the local image ID above. The assistant has not executed this push.

## 3. Update only the frontend in Azure Portal

Open **rooted-frontend-centralus → App → Revisions and replicas**, or use **Containers → Save as a new revision** if that is the Portal’s visible path.

| Setting | Value to use/preserve |
|---|---|
| Repository / tag | `rooted-frontend` / `navigation-20261030-1` |
| Revision suffix | `navigation-20261030-1` |
| Command / arguments | Blank |
| Registry pulls | Existing environment system-assigned managed identity |
| `BACKEND_URL` | `http://rooted-api` |
| `ROOTED_PUBLIC_ORIGIN` | `https://rooted-together.com` |
| Allocation | 0.5 CPU / 1 GiB |
| Ingress | External HTTPS, target port 3000; retain domain/certificate |
| Scale | Min 0 / max 10; retain existing HTTP rule/cooldown/polling |

First note the actual currently accepted revision/image. The last recorded rollback target is `rooted-frontend:pilot-20261028-4`, revision `rooted-frontend-centralus--admin-review-20261028-4`. Retain it, or the later accepted frontend if one exists. Create/save the new revision and verify readiness plus intended traffic. Preserve the current revision mode.

## 4. One short production smoke pass

Once the Portal rollout is confirmed, batch-check the six public routes, canonical/robots/sitemap output, screenshot assets, and `/api/v1/auth/options`. Expected production auth flags remain `localIssuer=false`, `demoLogin=false`, `accessBasedLogin=true`.

Check a representative old section link, the mobile menu and examples, plus the existing contributor/member entry and one published member study. Use the existing accounts and sessions. Inspect the new revision for startup/runtime errors. Do not create new production records or repeat the completed restore, AI-generation, worker, expiry, alert, and other 35-check acceptance journeys.

Record the final pushed digest, new revision/traffic, smoke evidence, and acceptance time in the [1.2.15 tracker](../../BuildPrompts/1.2.15/PHASE_TRACKER.md).

## Rollback

If this frontend release has a material failure, use the Portal to restore the retained accepted frontend revision/image and intended traffic, then confirm Home, the affected route, and sign-in/proxy behavior. The existing schema and backend remain compatible because this release changes presentation/navigation only. A database restore is not part of this rollback. See the [full rollout procedure](../../BuildPrompts/1.2.15/PRODUCTION_ROLLOUT.md).
