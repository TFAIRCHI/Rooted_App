# Identity — customer accounts and church authorization

## Function and requirement

Identity authenticates a person, handles signup/recovery and supplies an OIDC identity. Rooted's database then decides church membership and capabilities. Customer identity and church authorization are separate requirements.

Production identity is required, but a separate paid identity subscription is not automatically required for a small pilot. The fictional local issuer/demo identities are not the production solution.

## Choices and cost

| Choice | Initial cost model | Pros | Cons |
|---|---|---|---|
| Microsoft Entra External ID core | **$0 within the first 50,000 monthly active users** under current offering | Azure-integrated customer signup/sign-in | Premium features/SMS can charge; tenant/user-flow/token compatibility work needed |
| Existing compatible managed OIDC provider | Depends on its existing plan and limits | May reuse an already funded service | Different billing, identity lifecycle and claim support; not a presumed Azure-only choice |
| Self-hosted identity server | No assumed software-license fee; **hosting/operations extra** | Greater control | More patching, availability, recovery and security work; not automatically cheaper |

[Entra pricing](https://azure.microsoft.com/en-us/pricing/details/microsoft-entra-external-id/), [customer identity overview](https://learn.microsoft.com/en-us/entra/external-id/customers/overview-customers-ciam).

**October 26 approved requirement:** ordinary church members use email-code sign-in without an extra MFA challenge and remain signed in until they sign out. The user rejected a routine 30-day session deadline. Entra ID with MFA protects contributor, approver, publisher, moderator and administrative access. Preserve member-only church access unless the church explicitly selects public reading.

The local [authentication implementation](../../../backend/src/auth/routes.ts) now separates persistent reading sessions from time-bounded privileged MFA assurance. Both flows verify issuer, signature, audience, nonce and code/PKCE flow; contributor verification additionally requires signed `amr` containing `mfa` and recent `auth_time`. Workspace/admin operations and church-owner onboarding require MFA plus current capabilities. Read-only/member sessions receive no effective workspace capabilities, including after role promotion. Sign-out revokes the server session. Member browser cookies are renewed on use within browser storage limits; new server reading sessions have no scheduled expiry.

Production uses two confidential app registrations in one Entra external tenant and stable, verified tenant/object identity mapping across their pairwise subjects. Migration **027** and new frontend/backend image versions are required. These changes passed local automated checks; **Entra configuration, actual claims and cross-flow account behavior have not been tested live**. See the [Portal setup runbook](../../../deploy/azure/access-based-login.md) and [resume plan](../path-b-resume-plan.md#6-configure-production-identity-before-starting-apiworker).

## Cost minimization

Use the core offering where suitable, avoid SMS authentication if a suitable supported alternative meets the security requirements, and avoid duplicate identity platforms. Verify registrations, sign-in, recovery, logout and cost of any chosen premium methods. The pilot cost assumes $0 core MAU usage **after compatibility validation**, not that identity is already configured or every MFA method is free. No identity account or tenant was created in this research.
