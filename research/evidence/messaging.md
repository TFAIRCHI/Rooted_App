# Messaging evidence register — S30–S48

Access/research date for every entry: **2026-10-18**. Only official vendor sources are used. Publication/update dates below are source-displayed dates where available; an access date is not an update date. Confidence describes the narrow supported claim, not tested integration behavior, legal sufficiency, or guaranteed future pricing. Paraphrases are intentionally compact: combined source-derived wording in this register and the scheduling document remains below 200 words per source. Product recommendations are original proposed requirements.

## Twilio

### S30 — Messages resource

- URL: https://www.twilio.com/docs/messaging/api/message-resource
- Source date: no page-wide update date established. Confidence: **High**.
- Supported claim: SMS/MMS create/read operations, media, message identifiers, scheduling through Messaging Services, and documented lifecycle states. `sent` means upstream-carrier acceptance; `delivered` means delivery confirmation, including handset confirmation where available. SMS read receipts are not established.
- Limitations: API acceptance is not delivery; supported receipt detail depends on channel/network. Local deduplication does not establish provider exactly-once behavior. Authentication/security implementation needs its dedicated contract verified.

### S31 — Twilio Messaging Policy

- URL: https://www.twilio.com/en-us/legal/messaging-policy
- Source date: updated **2026-04-13**. Confidence: **High**.
- Supported claim: consent must be voluntary and specific to sender and subject; retain proof with date/method. Generally identify the consenting sender in messages and provide initial opt-out instructions. Consent is not transferable.
- Limitations: Vendor contractual requirements do not establish compliance for a particular church, country, or message. No universal retention period inferred.

### S32 — Customize users' opt-in and opt-out experience with Advanced Opt-Out

- URL: https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out
- Source date: no page-wide update date established. Confidence: **High**.
- Supported claim: Advanced Opt-Out blocks later sends with error `21610` and supplies `OptOutType` in the incoming webhook. It is disabled by default; the reviewed page says blocklist reporting/modification is unavailable through Console/REST API.
- Limitations: Configuration scope and number type matter. Blocking is not recall of in-flight delivery and is not an application consent ledger. This source does not establish a callback-signature verifier contract.

### S33 — Track the Message Status of Outbound Messages

- URL: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
- Source date: no page-wide update date established. Confidence: **High**.
- Supported claim: status callbacks report message progress. Most delivered/undelivered SMS/MMS callbacks include carrier receipt completion time in `RawDlrDoneDate`; read events are channel-specific.
- Limitations: Receipt timestamps and callbacks do not prove human reading. Callback authenticity, duplicates, ordering, and replay handling require separate implementation verification.

### S34 — Shutdown of Unregistered 10DLC Messaging

- URL: https://help.twilio.com/articles/14910496447771
- Source date: no fixed update date established. Confidence: **High** for the stated U.S. local-number requirement.
- Supported claim: U.S. 10DLC sending requires approved registration and campaign association with the Messaging Service containing the numbers. Unregistered sends are blocked with `30034`; messaging charges still apply.
- Limitations: This is not a toll-free or short-code onboarding guide. Exact current registration fees were not verified; the fee article linked from pricing did not render readable details.

### S35 — SMS Pricing in United States for Text Messaging

- URL: https://www.twilio.com/en-us/sms/pricing/us
- Source date: page states pricing current **October 2026**. Confidence: **High**, as a price snapshot.
- Supported claim: segment, number, carrier, registration, and failed-processing charges underpin the scheduling document's cost example.
- Limitations: The calculated $31.03 excludes extras; it is not a quote. Rates depend on usage and destination.

## Clearstream

### S36 — Clearstream API Documentation

- URL: https://api-docs.clearstream.io/
- Source date: versioned changelog exists; no single overall update date established. Confidence: **High**.
- Supported claim: API-key REST operations cover messages, subscribers, and replies. Documents opt-in defaults, shortcode exceptions, campaign states, delayed aggregate reports, individual failures, and shared-header webhook authentication.
- Limitations: No recipient-success callback equivalent established. Header authentication is not a body signature; opt-in status/overrides do not establish consent.

### S37 — Terms of Service

- URL: https://clearstream.io/terms
- Source date: updated **2026-07-07**. Confidence: **High**.
- Supported claim: explicit written consent must be documented and retained for the duration of service use. Customers must maintain SMS terms and privacy disclosures, including mobile-consent sharing restrictions. Customers remain responsible for applicable legal requirements.
- Limitations: Contractual obligations can be stricter than a general characterization of informational SMS law. API opt-in mechanisms do not replace the required evidence.

### S38 — How are text opt-outs handled?

- URL: https://help.clearstream.io/en/articles/2287364-how-are-text-opt-outs-handled
- Source date: relative update label only. Confidence: **High** for documented behavior.
- Supported claim: initial interaction includes opt-out instructions. STOP, END, QUIT, CANCEL, and UNSUBSCRIBE suppress texts; machine learning also handles natural-language requests/misspellings. Opt-outs are account/subaccount specific; shared short-code recipients can use STOP ALL.
- Limitations: Natural-language detection accuracy is not quantified. Do not assume all accounts share suppression or that suppression removes the subscriber record.

### S39 — Why do I need to register my account?

- URL: https://help.clearstream.io/en/articles/5586354-why-do-i-need-to-register-my-account
- Source date: relative update label only. Confidence: **High**.
- Supported claim: local-number organization messaging requires A2P 10DLC registration; organization information such as EIN/address supports identity verification. Clearstream says it covers carrier registration and messaging fees.
- Limitations: Registration is not recipient consent or a delivery guarantee. Confirm unusual organization eligibility and required fields during onboarding.

### S40 — Clearstream Plans & Pricing

- URL: https://clearstream.io/pricing/
- Source date: no fixed update date established. Confidence: **High**, as a U.S. snapshot.
- Supported claim: U.S. subscription credit/number tiers, free inbound texts, variable outbound credits, expiring monthly allocations, separate rollover purchases, and optional auto-refill support the comparison.
- Limitations: Country sections differ. Extra-credit prices, API charges, and dedicated short-code totals remain unverified; confirm the final message's credit estimate.

## Text In Church

### S41 — API Overview

- URL: https://api-docs.textinchurch.com/docs/getting-started
- Source date: no fixed update date established. Confidence: **High** for the published technical contract.
- Supported claim: developer access requires support approval; REST accepts form-encoded requests, returns JSON, and uses bearer tokens with user-linked permissions. Base URL: `https://api.textinchurch.com/API/1_0/`; paths are case-sensitive.
- Limitations: Conflicts with marketing route examples in S42. Actual enabled endpoints, entitlement, limits, and version must be confirmed before implementation.

### S42 — Open API Access

- URL: https://textinchurch.com/open-api-access
- Source date: no fixed update date established. Confidence: **Medium** for implementation readiness; explicit marketing claims are verified.
- Supported claim: advertises programmatic SMS/MMS/email, scheduling, incoming replies, contacts, workflows, delivery webhooks, and signature verification. Examples use `/api/v1/...` routes.
- Limitations: Route/body examples differ from S41. Detailed callback enums, signatures, replay controls, sandbox access, and endpoint availability were not verified. Do not implement directly from marketing samples.

### S43 — Acceptable Use Policy

- URL: https://textinchurch.com/acceptable-use-policy
- Source date: revised **2026-09-04**. Confidence: **High**.
- Supported claim: informational messages require prior express consent; marketing requires prior express written consent. Consent records include date/time/source/content and must be retained at least four years. Honor revocations promptly, within ten business days at most; fresh express consent is required afterward. Collection disclosures include organization/program, purpose, frequency, rates, HELP/STOP, privacy, and terms.
- Limitations: These are vendor obligations, not permission to keep sending for ten days. Other jurisdictions and requirements need separate assessment.

### S44 — Multiple Phone Numbers

- URL: https://help.textinchurch.com/en/articles/4249769-multiple-phone-numbers
- Source date: relative update label only. Confidence: **High**.
- Supported claim: supports multiple local 10-digit numbers and number-specific user access. STOP to any account number opts the contact out account-wide. Additional numbers cost $4/month each or $9/month for three; annual options are also listed.
- Limitations: Extra-number prices do not establish the base subscription or current plan inclusion. Account-wide suppression must be reflected in the adapter and ledger.

### S45 — Troubleshooting Text Messages

- URL: https://help.textinchurch.com/en/articles/7981108-troubleshooting-text-messages
- Source date: relative update label only. Confidence: **High** for the published help definition, not a carrier receipt guarantee.
- Supported claim: U.S. sending requires approved registration through Sender Profile and a configured local number. START can restore subscription. UI delivery errors are inspectable; Delivered is described as successful departure from the platform.
- Limitations: Do not equate this definition with handset receipt or Twilio's delivery state. API enums and callback mapping remain unverified. Import permission toggles do not establish legal consent.

### S46 — Pricing & Plans | Try the #1 Church Texting App for Free

- URL: https://textinchurch.com/pricing
- Source date: no fixed update date established. Confidence: **High** for observed page content; **Low** for a current subscription total.
- Supported claim: current Core/Plus/Suite presentation uses credits; standard SMS is described as 160 characters and image MMS as two credits. Retrieved dollar prices render as dashes.
- Limitations: Two-credit MMS conflicts with S47. A missing rendered dollar value is not evidence of free service. Obtain a written quote and billing definitions.

### S47 — Understanding Text In Church Plans and Pricing

- URL: https://help.textinchurch.com/en/articles/15693581-understanding-text-in-church-plans-and-pricing
- Source date: **2026-08-17**. Confidence: **High** for the article's statements; **Medium** for applicability pending reconciliation.
- Supported claim: describes Core/Plus/Suite; standard SMS up to 160 characters costs one credit, special-character SMS up to 70 costs one, and image MMS costs three. Incoming messages are free; credits do not roll over.
- Limitations: MMS differs from S46; segment accounting differs from S48. Do not select a favorable rule without confirmation of the customer's contract.

### S48 — Allotment and Usage FAQs

- URL: https://help.textinchurch.com/en/articles/7939099-allotment-and-usage-faqs
- Source date: no fixed update date established. Confidence: **High** for the published statements; **Medium/Low** for current-plan applicability.
- Supported claim: says up to three standard SMS segments count as one allotted message; lists $0.03/message overage and recurring 500-message bundles for $12/month. Messages accepted by the carrier consume allotment; successful compliance messages also count.
- Limitations: Conflicts with S47's segment-based credit explanation. Legacy plan examples may not describe current Core/Plus/Suite billing. Treat overage, bundle, and segment rules as unresolved pending written confirmation.

## Evidence boundaries and unresolved work

No provider was exercised; throughput, approval speed, and relative deliverability were not benchmarked. No vendor is claimed to provide exactly-once SMS. Country-specific law, quiet hours, and callback security require further primary documentation during implementation. The scheduling document's DST behavior, outbox, 15-minute recovery policy, consent-race handling, and conservative timezone fallback are proposed application controls, not sourced vendor guarantees.

Obtain written clarification of Text In Church's supported API version, callback contract, current quote, MMS credits, multipart accounting, bundles, and API/registration fees. Confirm Clearstream's success-receipt detail and dedicated-shortcode overrides. Confirm Twilio's exact registration/campaign charges and callback-verification contract. Preserve these unknowns in procurement and release gates rather than treating documentation gaps as unsupported capabilities or missing features.
