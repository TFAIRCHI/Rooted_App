# Source register

All entries accessed **2026-10-18**. Primary/official sources are preferred. Confidence is confidence in the narrow documentation claim, not certification of our implementation, legal compliance, negotiated pricing, or account eligibility. Verified means documentation was opened by the parent agent or a parallel research agent; no authenticated API or SMS integration test was performed. Prices and dynamic docs must be rechecked before procurement. Proposed product behavior is labeled Recommendation rather than external fact.

The detailed evidence records include exact claim boundaries and caveats: [Planning Center](evidence/planning-center.md), [messaging](evidence/messaging.md), [security](evidence/security.md). Entries below explicitly record title, URL, date, confidence and supported use. Inline `[Sxx]` references elsewhere refer to these IDs. Grouped citations do not imply all sources support every clause.

## Planning Center

### S01
**Authentication** — [Official documentation](https://api.planningcenteronline.com/docs/overview/authentication). Accessed 2026-10-18. Confidence **High**. Supports product scopes, OAuth endpoints/lifecycle, PKCE and no-scope `/current/v2/me` identity versus People-permission access. Does not establish seamless Church Center SSO or ordinary-member OAuth eligibility in our app. See evidence for exact scope list and expiry details.

### S02
**Episode — Publishing API, version 2024-03-25** — [API reference](https://api.planningcenteronline.com/docs/apps/publishing/versions/2024-03-25/vertices/episode). Accessed 2026-10-18. Confidence **High**. Supports documented episode metadata/associations, current read/write operations, pagination and generated audio-download link. Account access and media availability untested; does not establish automatic transcripts.

### S03
**New: Publishing Sermons API** — [Planning Center changelog](https://www.planningcenter.com/changelog/publishing/25080772906139-new-publishing-sermons-api). Accessed 2026-10-18. Confidence **High** for announcement history and Episode/EpisodeTime event families; historical read-only wording is superseded by current endpoint reference. Exact current event names require enumeration.

### S04
**Rate Limiting** — [API overview](https://api.planningcenteronline.com/docs/overview/rate-limiting). Accessed 2026-10-18. Confidence **High**. Supports default request-window limits, special high-offset limit, dynamic rate headers and Retry-After. Endpoint/account variations remain possible.

### S05
**Webhooks** — [API overview](https://api.planningcenteronline.com/docs/overview/webhooks). Accessed 2026-10-18. Confidence **High**. Supports delivery acknowledgment, retry/deactivation behavior and HMAC authenticity verification. Duplicate/out-of-order tolerance is our recommended consumer design.

### S06
**AvailableEvent — Webhooks API, version 2022-10-20** — [API reference](https://api.planningcenteronline.com/docs/apps/webhooks/versions/2022-10-20/vertices/available_event). Accessed 2026-10-18. Confidence **High**. Supports available-event enumeration and metadata. We have not queried a church account's actual event catalog.

### S07
**NoteTemplate — Publishing API, version 2024-03-25** — [API reference](https://api.planningcenteronline.com/docs/apps/publishing/versions/2024-03-25/vertices/note_template). Accessed 2026-10-18. Confidence **High**. Supports authored template text and documented operations. A notes field does not imply verbatim transcription.

### S08
**Add and manage episodes** — [Planning Center help](https://help.planningcenter.com/en/139229-add-and-manage-episodes.html). Accessed 2026-10-18. Confidence **High**. Supports episode management, resources and manually supplied note text. Does not verify a speech-recognition/transcript API.

### S09
**Set up Church Center and Publishing** — [Planning Center help](https://help.planningcenter.com/en/179950-set-up-church-center-and-publishing.html). Accessed 2026-10-18. Confidence **High**. Supports custom navigation/external-link strategy. External destination authorization is our responsibility; identity handoff unverified.

### S10
**Log in to Church Center** — [Planning Center help](https://help.planningcenter.com/en/141275-log-in-to-church-center.html). Accessed 2026-10-18. Confidence **High**. Describes Church Center's own verification-code login. Does not establish third-party OIDC/SAML or silent reuse of its session.

### S11
**New: Member and Link-Only Pages** — [Planning Center changelog](https://www.planningcenter.com/changelog/publishing/25149236642459-new-member-and-link-only-pages). Accessed 2026-10-18. Confidence **High**. Supports native page visibility distinctions; link-only access is not authorization for our external site.

## Security, accessibility, and reliability

### S20
**Row Security Policies** — [PostgreSQL documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). Accessed 2026-10-18. Confidence **High**. Privileged-role, owner and integrity-check exceptions mean RLS requires role discipline and additional authorization. [Versioned reference](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). `/current` may change; representative schema uses PostgreSQL semantics, not a managed-provider guarantee.

### S21
**Web Content Accessibility Guidelines (WCAG) 2.2** — [W3C Recommendation](https://www.w3.org/TR/WCAG22/). Accessed 2026-10-18. Confidence **High**. Defines A/AA complete-workflow conformance including relevant focus, input and authentication criteria. It does not certify this prototype or settle jurisdictional legal duties.

### S22
**LLM Prompt Injection Prevention Cheat Sheet** — [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Accessed 2026-10-18. Confidence **High**. Supports layered handling of indirect input, deterministic permission checks and tool/output validation. Neither retrieval nor a model refusal establishes prevention.

### S23
**Transactional outbox pattern** — [AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html). Accessed 2026-10-18. Confidence **High**. Supports atomic business/outbox records and idempotent consumers for duplicate delivery; does not promise exactly-once SMS or carrier delivery.

### S24
**Time Zone Database** — [IANA](https://www.iana.org/time-zones). Accessed 2026-10-18. Confidence **High**. Rules change; preserve IANA identifiers and resolution metadata. DST policies in this product are recommendations.

### S25
**Handling of Invalid or Ambiguous Timestamps** — [PostgreSQL documentation](https://www.postgresql.org/docs/18/datetime-invalid-input.html). Accessed 2026-10-18. Confidence **High**. Describes database gap/overlap interpretation. Our explicit reject/choose policy intentionally prevents unnoticed database interpretation.

### S26
**Evaluating Web Accessibility Overview** — [W3C WAI](https://www.w3.org/WAI/test-evaluate/). Accessed 2026-10-18. Confidence **High**. Supports combining tools with human evaluation; automated checks do not establish complete accessibility.

### S27
**SET** — [PostgreSQL documentation](https://www.postgresql.org/docs/18/sql-set.html). Accessed 2026-10-18. Confidence **High**. Supports transaction-local setting lifetime. Tenant authentication still belongs in the trusted application.

### S28
**Locking objects with Object Lock** — [Amazon S3 documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html). Accessed 2026-10-18. Confidence **High**. Distinguishes governance and compliance retention modes. Optional architecture alternative; not required for MVP and not a substitute for privacy retention decisions.

## Messaging providers

### S30
**Messages resource** — [Twilio Messaging API](https://www.twilio.com/docs/messaging/api/message-resource). Accessed 2026-10-18. Confidence **High**. Supports API message creation, scheduling/status identifiers and states. Provider submission is distinct from delivery/read.

### S31
**Twilio Messaging Policy** — [Official policy](https://www.twilio.com/en-us/legal/messaging-policy). Accessed 2026-10-18. Confidence **High**. Supports sender/purpose-specific consent, proof, identity and opt-out obligations. These are vendor policy terms; legal applicability requires separate review.

### S32
**Customize users' opt-in and opt-out experience with Advanced Opt-Out** — [Twilio documentation](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out). Accessed 2026-10-18. Confidence **High**. Supports configurable opt-out handling, incoming opt-out metadata and blocked-send behavior. Default configuration and blocklist limitations require attention; cannot recall in-flight messages.

### S33
**Track the Message Status of Outbound Messages** — [Twilio guide](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status). Accessed 2026-10-18. Confidence **High**. Supports callbacks and delivery-state interpretation. SMS delivery is not a read receipt.

### S34
**Shutdown of Unregistered 10DLC Messaging** — [Twilio help](https://help.twilio.com/articles/14910496447771). Accessed 2026-10-18. Confidence **High**. Supports U.S. local-number A2P registration/blocking behavior. Registration fees are not inferred from an unreadable pricing article.

### S35
**SMS Pricing in United States for Text Messaging** — [Twilio pricing](https://www.twilio.com/en-us/sms/pricing/us). Accessed 2026-10-18. Confidence **High** for displayed base rates and number charges. Carrier, registration, volume, failure, tax and feature charges mean base arithmetic is not all-in cost.

### S36
**Clearstream API Documentation** — [Official API](https://api-docs.clearstream.io/). Accessed 2026-10-18. Confidence **High**. Supports key authentication, sending/scheduling, subscriber/list APIs, webhook mechanisms and report/failure events. No equivalent recipient success callback is assumed without further evidence.

### S37
**Terms of Service** — [Clearstream](https://clearstream.io/terms). Accessed 2026-10-18. Confidence **High**. Supports written-consent retention and program disclosures. An API subscriber state alone does not prove consent.

### S38
**How are text opt-outs handled?** — [Clearstream help](https://help.clearstream.io/en/articles/2287364-how-are-text-opt-outs-handled). Accessed 2026-10-18. Confidence **High**. Supports automatic opt-out handling and account/subaccount suppression scope. Any documented override capability is not permission to message.

### S39
**Why do I need to register my account?** — [Clearstream help](https://help.clearstream.io/en/articles/5586354-why-do-i-need-to-register-my-account). Accessed 2026-10-18. Confidence **High**. Supports sender/organization registration requirements and stated carrier-fee handling; SaaS multi-church commercial model untested.

### S40
**Clearstream Plans & Pricing** — [Official pricing](https://clearstream.io/pricing/). Accessed 2026-10-18. Confidence **High** for displayed plans/credits. Incoming traffic and outgoing credit accounting differ; confirm API entitlement, refill and commercial arrangements before cost comparison.

### S41
**API Overview** — [Text In Church technical documentation](https://api-docs.textinchurch.com/docs/getting-started). Accessed 2026-10-18. Confidence **High** for documented base URL/auth and approval requirement. Conflicts with marketing examples mean the applicable integration version remains Unknown.

### S42
**Open API Access** — [Text In Church](https://textinchurch.com/open-api-access). Accessed 2026-10-18. Confidence **Medium**. Advertises sends, schedules and delivery webhooks/signature verification. Exact schemas/base path/signature procedure need technical confirmation.

### S43
**Acceptable Use Policy** — [Text In Church](https://textinchurch.com/acceptable-use-policy). Accessed 2026-10-18. Confidence **High**. Supports informational/marketing consent distinctions, disclosure and retained-consent requirements including four years. Vendor terms are not a complete legal opinion.

### S44
**Multiple Phone Numbers** — [Text In Church help](https://help.textinchurch.com/en/articles/4249769-multiple-phone-numbers). Accessed 2026-10-18. Confidence **High**. Supports account-wide STOP scope and documented extra-number options; verify current contract pricing.

### S45
**Troubleshooting Text Messages** — [Text In Church help](https://help.textinchurch.com/en/articles/7981108-troubleshooting-text-messages). Accessed 2026-10-18. Confidence **High** for stated UI status semantics and registration. Its “Delivered” definition does not establish handset receipt.

### S46
**Pricing & Plans** — [Text In Church pricing](https://textinchurch.com/pricing). Accessed 2026-10-18. Confidence **Low for current total price**, High that the observed page did not expose usable plan dollar amounts. Its image-credit statement conflicts with S47.

### S47
**Understanding Text In Church Plans and Pricing** — [Text In Church help](https://help.textinchurch.com/en/articles/15693581-understanding-text-in-church-plans-and-pricing). Accessed 2026-10-18. Confidence **Medium**. Documents a newer credit model whose MMS treatment conflicts with S46; quote/account applicability needed.

### S48
**Allotment and Usage FAQs** — [Text In Church help](https://help.textinchurch.com/en/articles/7939099-allotment-and-usage-faqs). Accessed 2026-10-18. Confidence **Low for current pricing applicability**. Older message/segment and overage accounting differs from newer credit guidance; do not use to calculate current total.

## AI, transcription, and Scripture sources

### S50
**Pricing — OpenAI API** — [Official pricing](https://developers.openai.com/api/docs/pricing). Accessed 2026-10-18. Confidence **High** for displayed estimated transcription rates: mini $0.003/minute and standard $0.006/minute. Rates are illustrative candidates; actual usage, retries and model choice differ. No text-model quote has been selected.

### S51
**Data controls in the OpenAI platform** — [Official documentation](https://developers.openai.com/api/docs/guides/your-data). Accessed 2026-10-18. Confidence **High**. Endpoint-dependent abuse monitoring/application-state retention and eligible retention controls must be checked for the chosen request configuration. `store:false` alone does not settle all retention; do not promise blanket zero retention.

### S52
**File transcription** — [OpenAI guide](https://developers.openai.com/api/docs/guides/speech-to-text). Accessed 2026-10-18. Confidence **High**. Supports the documented 25 MB provider upload limit and splitting/compression guidance. Product-level file limits and preprocessing remain our design choices.

### S53
**Introduction to the ESV API** — [Crossway ESV API](https://api.esv.org/). Accessed 2026-10-18. Confidence **High**. Free API terms specify non-commercial use and content/caching limits. A paid SaaS needs a rights determination; church purpose does not automatically establish eligibility.

### S54
**Guide to Permissions / ESV Bible Permissions** — [Crossway](https://www.crossway.org/permissions/). Accessed 2026-10-18. Confidence **High**. Publishes quotation/use conditions and permission-request process. The general guidelines and API terms are distinct; commercial/corpus use must be confirmed.

### S55
**John 6:68 — King James Version** — [Bible Gateway text](https://www.biblegateway.com/passage/?search=John+6%3A68&version=KJV). Accessed 2026-10-18. Confidence **High** for displayed verse wording only. Used to check prototype excerpt/reference, not to verify interpretation, public-domain status worldwide, or redistribution rights for a commercial corpus.

## Adjacent products

### S60
**Use Sermon Shots to Create a Discussion Guide** — [Official product page](https://sermonshots.com/discussion-guide/). Accessed 2026-10-18. Confidence **Medium**: vendor description establishes advertised discussion-guide capability, not performance, unique features or independently tested quality. Supplementary [examples](https://sermonshots.com/examples-ed/) page accessed 2026-10-18 advertises devotional outputs; confidence Medium.

### S61
**Team — Sermonary** — [Official product page](https://sermonary.com/team/). Accessed 2026-10-18. Confidence **Medium**. Supports advertised team briefs/live notes/group-preparation positioning. No inference of missing approvals or measured adoption.

### S62
**Chronicle — AI-Powered Sermon Management** — [Official product page](https://www.chronicle.church/). Accessed 2026-10-18. Confidence **Medium**. Supports advertised transcription/search/chat/shareable-guide capabilities. No accuracy or market-share claims adopted.

## Research hygiene and revalidation

No endpoint, scope or current price is derived from model memory. Unreadable or conflicting documentation remains Unknown rather than silently filled in. Official claims are paraphrased narrowly; no whole documentation pages are copied. Future implementation must capture redacted actual requests/responses, entitlement checks, webhook signatures, delivered status evidence and revocation tests. Review source changes at Phase 0 exit and again before production integration or pricing commitments.

## Rooted 1.2.9 research addendum

Accessed **2026-10-21**. Sources support only the narrow external claims listed below. Proposed UI dimensions, week conventions, automatic-moderation rules, schema, thresholds, retention, and analytics definitions are our recommendations, not provider guarantees. Local code findings are independently identified in [research 23](23-study-management-workflow-and-engagement.md).

### S63
**PostgreSQL 18 — 5.5 Constraints** — [Official documentation](https://www.postgresql.org/docs/current/ddl-constraints.html). Confidence **High**. Composite keys/foreign keys and explicit referential actions support preserving relational integrity. Choice of soft deletion and active-date uniqueness is a product design decision. The accessed current documentation resolved to PostgreSQL 18; verify deployed server version before applying migrations.

### S64
**Transparency note for Sentiment Analysis** — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/language-service/transparency-note-sentiment-analysis). Confidence **High** for documented sentiment-model limitations and need for domain testing/human review; **Unknown** for any classifier's performance on Rooted comments. The retrieved article body includes domain mismatch, sarcasm, subjectivity and false-positive/negative limitations. A sentiment label does not verify church-policy violation. This source does not establish an integration, endpoint, chosen model, price, retention policy, or access entitlement.

### S65
**PostgreSQL 18 — 9.9 Date/Time Functions and Operators** — [Official documentation](https://www.postgresql.org/docs/current/functions-datetime.html). Confidence **High**. Supports civil-date arithmetic and timezone-aware date/time functions. Sunday week starts and month-clipped grouping are Rooted recommendations, not database defaults; do not assume date_trunc('week') has the proposed convention.

### S66
**Understanding SC 1.4.1: Use of Color** — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Confidence **High**. Supports providing text/shape or other cues with status colors. Passing this guidance alone does not establish full application accessibility.

### S67
**Understanding SC 1.4.11: Non-text Contrast** — [W3C WAI](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html). Confidence **High**. Supports contrast for meaningful interface/graphical state cues. Does not prescribe Rooted branding dimensions or require recoloring a church's logo.

### S68
**PostgreSQL 18 — 5.9 Row Security Policies** — [Official documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). Confidence **High**. Supports RLS policies and documented owner/superuser/BYPASSRLS caveats. Tenant-security correctness still requires tests with actual runtime privileges.

### S69
**Understanding SC 1.4.10: Reflow** — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Confidence **High**. Supports narrow-width/zoom reflow without loss of content/function, subject to documented exceptions. Does not prove the existing app or proposed preview conforms.

### S70
**CSS Images Module Level 3 — object-fit / Object Sizing** — [W3C specification](https://www.w3.org/TR/css-images-3/#the-object-fit). Confidence **High**. Supports contain sizing within an image box while respecting aspect ratio. Asset padding, legibility, dimensions and chosen display size remain design/asset questions.

### S71
**Logging Cheat Sheet** — [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). Confidence **High**. Supports excluding sensitive content/credentials, validating log data and protecting event records. Rooted event fields, retention and pastoral-data policy remain application choices.

### S72
**Dialog (Modal) Pattern** — [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Confidence **High**. Supports modal focus containment, Escape and focus-return behavior. Rooted destructive-confirmation copy and initial focus selection remain implementation recommendations.

## Rooted 1.2.10 member-home research addendum

Accessed **2026-10-22**. The intended design file is not visually accessible in the current session; no visual details are inferred from its title or login wall. Current application observations are verified by source inspection and are not claims about the Figma design.

### S73
**Login screen design — Figma Make file** — [Figma Make reference supplied by the user](https://www.figma.com/make/JLNGMpwbBeSv2XeIqPa9Zl/Login-screen-design?t=Aft13bJG0GPyTzaT-0). Accessed 2026-10-22. Confidence **High** that the current unauthenticated browser session presents a Figma sign-up/sign-in gate; **None** for the intended design's visual content. No project frame, components, text, colors, or layout were observable. Owner-provided access or screenshots are required before visual execution.

### S74
**Understanding Success Criterion 2.5.8: Target Size (Minimum)** — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). Accessed 2026-10-22. Confidence **High** for the criterion's 24-by-24 CSS-pixel minimum target or spacing exception; this is a criterion-specific summary, not a full accessibility assessment. This proposal additionally recommends 44-by-44 CSS-pixel member touch controls where practical; that is a usability target, not a claim of AA conformance.

### S75
**Functions: cookies** — [Next.js App Router documentation](https://nextjs.org/docs/app/api-reference/functions/cookies). Accessed 2026-10-22. Confidence **High** for the documented dynamic-rendering implications of reading request cookies in the App Router. Application-specific caching and authorization must still be verified in the deployed code path.

### S76
**Understanding Success Criterion 1.4.10: Reflow** — [W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Accessed 2026-10-22. Confidence **High** for the requirement's narrow viewport reflow intent and its exceptions; a passing automated test alone does not establish conformance.
