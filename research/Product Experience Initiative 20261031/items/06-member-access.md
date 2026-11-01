# 6. Member access — preferred phone entry, correct church and durable identity

**Reassessed decision:** preserve phone-first as the preferred future experience and QR routing as a smaller improvement. The merged creator/source library does not change member authority, leak staff sources or justify collecting extra information before reading.

## Intended journey

Church/study QR or church choice → phone/country → verified code → name if needed → clearly named church join/continue under its policy → intended reading destination. An open self-enrollment church can complete enrollment on that continuation without a second registration form. Approval/invitation churches show the honest result.

Phone is an entry/verified credential, not a permanent person ID. Use stable internal principals and trusted issuer/subject links. Name or a directory phone match cannot choose an existing private account or grant staff capabilities.

## Current constraints

Microsoft's [External ID customer FAQ](https://learn.microsoft.com/en-us/entra/external-id/customers/faq-customers) documents customer SMS limitations; the current customer-tenant architecture is not a phone-first toggle. Existing outbound Twilio Messages is not an identity/Verify integration. These source-verified findings were rechecked by engineering; no SMS was sent.

| Route | Assessment |
|---|---|
| QR plus current verified auth | Improve church/return context first; explicitly not completion of phone-first login |
| Managed phone-capable OIDC member identity | Preferred evaluation; still requires migration/linking/recovery and actual delivery |
| Narrow Verify-backed issuer | Conditional alternative with Rooted owning issuer/session/abuse/recovery work |
| Unverified phone/name form | Cannot authenticate, merge accounts or prove church membership |

Member login must not weaken contributor/admin MFA or make a phone credential staff authority.

## Church policy and recovery

A shareable QR is routing, not authorization or communication consent. Resolve destination/policy server-side. Offer open, approval-required or invitation-only enrollment with Joined/Pending/Invitation needed states. Preserve selected church through OTP failure, account switch and reload; show who is signed in on a shared browser.

Handle multi-church accounts, changed/recycled numbers, shared household phones, delayed/expired SMS and unsupported countries. Do not reveal a private household person-picker to someone merely possessing a number. Use another supported credential or assisted recovery; define old-session revocation. Reminder opt-in is separate and off by default. No user must share a deck or play media to complete reading.

## Planning Center

The existing integration is Publishing. [Planning Center authentication](https://api.planningcenteronline.com/docs/overview/authentication) treats People as a separate scope. Future authorized People sync normalizes permitted person/phone records into candidate associations for controlled reconciliation; it is not authentication, member consent or a staff grant. Handle revoked scopes, duplicates, deletion and rate-limit responses. Church source imports do not automatically include directory records.

## Feasibility and cost

QR/context and simulated phone/enrollment flows can be explored locally. Phone-first remains conditional on provider selection, owned-number delivery/recovery/abuse tests and existing-account migration. People sync requires separate authorized account testing. Current provider price inputs and scenario formulas are dated in [engineering feasibility](../architecture/technical-feasibility.md); do not reuse an October dollar example as a current quote.

Test real valid/expired/replayed OTPs, resend/attempt budgets, international formatting, shared/recycled-number recovery, issuer validation, current-session linkage, church return policy and cross-tenant denial. Research simulations cannot establish number ownership, church membership or real-device delivery. See [member review](../roles/church-member-assessment.md) and [mockups](../mockups/README.md).
