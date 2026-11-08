# Study delivery and reader access: two architecture options

Research snapshot: **2026-11-04**. These documents compare two proposed paths from Rooted's current member sign-in and Twilio delivery architecture. They are for decision-making; no application or Azure deployment was changed.

1. [Option A — verified phone and member access](option-a-phone-verified.md): one-tap entry for a verified member, with restricted study access and member-linked engagement.
2. [Option B — public links and account-free participation](option-b-public-links.md): stable shareable links, a public church study page, anonymous reactions and named, moderated comments.
3. [Church member mental-model comparison](member-mental-model-comparison.md): what each approach feels like from receiving the SMS through reading and participating.
4. [Option B Twilio setup guide](option-b-twilio-setup.md): what the church or Rooted operator must prepare in Twilio, how to register a sender, collect consent, configure callbacks and run a limited pilot.
5. [Option B migration plan](option-b-migration-plan.md): detailed data, API, UI, SMS and Azure transition, with compatibility, rollback and release checks; paired with the [build prompt](../../BuildPrompts/option-b-public-study-migration/MASTER_BUILD_PROMPT.md).

| Decision factor | Option A | Option B |
| --- | --- | --- |
| Read after tapping SMS | One tap after initial phone verification; expired/used link may need recovery | One tap, no setup or login |
| Who can read | Authorized church members | Anyone with the link; public library may expose all live studies |
| Link behavior | Short-lived, single-use credential | Stable, shareable public URL |
| Comments | Attributed to member account | Requires a self-provided, unverified name and moderation |
| Reactions | Member-linked | No name or sign-in; one-per-person cannot be guaranteed |
| SMS requirements | Consent, Twilio sending setup, plus phone verification/login flow | Consent and Twilio sending setup; no reader verification flow |
| Main operational cost | Identity binding, link/session recovery | Public-content review, spam prevention and moderation |

**Provisional recommendation:** Option B best serves the stated goal of making receiving and reading a study as easy as possible, provided the church accepts that published material and approved comments are public. The decision should be made before changing the church's `readingPolicy`, since public studies can be shared beyond the SMS list.
