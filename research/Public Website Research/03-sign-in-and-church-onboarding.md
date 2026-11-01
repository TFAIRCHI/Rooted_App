# From public visitor to a church’s first week

This is the proposed acquisition and onboarding design, not a claim that email-code signup is already connected.

## Proposed paths

| Visitor | Journey | Intended destination |
|---|---|---|
| New church leader | Homepage → Get started → “I help lead a church” → email sign-in → verify → church setup → first steps | The newly authorized church workspace |
| Returning team member | Header Sign in → identity verification → authorized church selection if needed | Their existing dashboard, not another church creation form |
| Church member | Get started → “I’m joining my church” → church link/invitation → sign-in | The member experience for the authorized church |
| Curious visitor | Homepage → example week or sample devotional | Continue learning without an account requirement |

Authentication establishes identity. It must not establish church membership simply because the person typed a church name, entered an email domain, or pasted a public URL.

## Screen decisions

**Get started:** two large choices distinguish church creation from joining. This prevents a member from accidentally making a duplicate church workspace. A quieter existing-account sign-in link remains visible.

**Sign in:** the proposal uses email followed by a verification code, with one path for new and returning accounts. This is an interaction recommendation, not a selected identity-provider contract. The screenshot shows what a completed email-code experience could look like. Actual implementation should reuse the application’s identity provider/session architecture and only expose methods configured there.

**Verify email:** carry the email forward, allow correction and support resend/recovery. Production needs expiration, attempt limits, abuse controls, verified identity callbacks and safe session handling. The research screen accepts fictional six-digit values only to demonstrate navigation; it sends nothing and provides no authentication security.

**Create a church:** ask for church name, church link and timezone. Show an immediate member-page preview. A person must state they are authorized to create the workspace. That statement does not authorize access to an existing church. Detect occupied slugs server-side and keep identity, invitation and church membership checks on the backend.

**First steps:** explain what to do next: bring notes, invite the team, then share the member link once reviewed content is published. Do not require a logo, AI setup, member list import, payment or sermon upload before the visitor understands the workspace. Inviting an eligible reviewer matters because the existing editorial workflow separates authorship, approval and publication.

The prototype’s first-steps CTA opens an illustrative member devotional. The production CTA should enter the real church dashboard or guided first-study flow. The returning-user prototype also ends at first steps; production should restore the user’s actual destination and permissions.

## Pricing remains undecided

The homepage FAQ and entry page acknowledge that plan options are being finalized. No amount, tier, trial duration, “free forever,” unlimited AI allowance or billing-provider commitment is invented.

Before launching public self-service creation, choose whether access is an invited pilot, an interest request, or an available workspace with a defined allowance. The design recommendation is to let users understand the product first and present any paid terms before a paid commitment. This does not decide whether workspace creation itself should be free.

If pricing is still unresolved at launch, use the same visual direction with a clearly labeled pilot/interest path rather than silently granting unlimited product usage. Interest collection must describe what happens next and should not masquerade as immediate access. The current screenshots explore the eventual self-service experience, not a claim that commercial access is already available.

## What stays out of the first signup

Planning Center authorization, SMS provisioning, AI deployment credentials, payment details, doctrinal configuration and long transcript ingestion do not belong in this initial form. They can follow as appropriate workspace tasks. This keeps the public promise focused on a church’s teaching and its people, rather than infrastructure setup.

Keep the platform introduction separate from church invitations and individual membership details. Do not expose a public directory of members or grant editor capabilities through the member join path.
