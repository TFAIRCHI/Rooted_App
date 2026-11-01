# Rooted Dummy Development Logins

These credentials are **local development fixtures only**. They are not real accounts, must not be reused outside this repository, and must be disabled whenever `NODE_ENV` is not development/test.

| Login | Username | Password | Expected access |
|---|---|---|---|
| Contributor 1 | `anna.contributor` | `RootedDemo!2026A` | Contributor workspace |
| Contributor 2 | `james.contributor` | `RootedDemo!2026B` | Contributor workspace |
| Church Member | `riley.member` | `RootedDemo!2026C` | Published member studies |
| Administrator | `morgan.admin` | `RootedDemo!2026D` | Contributor workspace plus admin Settings |

## Fixture rules

- Seed only when `ROOTED_ENABLE_DEMO_LOGINS=true` and the environment is development/test.
- Never print passwords in application logs, API responses, screenshots, or production seed data.
- Make fixture password hashes deterministic only for isolated local/test databases; use a real password hash algorithm.
- The UI may show clearly labeled “Demo login” shortcuts only when the explicit development flag is enabled.
- Each fixture must have a separate identity, session, church membership, and audit trail.
- Tests must verify that selecting or guessing another role does not change server authorization.
