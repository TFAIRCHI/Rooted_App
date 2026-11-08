# Option B: what you need to do for Twilio

Research snapshot: **2026-11-04**. This guide accompanies [Option B's architecture proposal](option-b-public-links.md). It describes the Twilio work for sending a creator's note and a public study link by SMS. It is a preparation and rollout guide; Option B has **not** been implemented or activated in Rooted.

## The short answer

You need a paid Twilio account, a suitable SMS sender registered for the destination countries, an approved messaging use case, a way to obtain and prove each recipient's consent, public privacy/terms information for registration, and a decision about which legal organization sends each church's texts. You then provide the Twilio account/sender identifiers and credentials to the Rooted operator through Azure secrets, approve the exact SMS wording and budget, and test with a small group that opted in. **You do not need Twilio Verify for Option B**: opening a public study link does not authenticate a reader.

Twilio's [Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy) requires informed recipient consent, sender identification, retained proof of consent, and a straightforward opt-out. A phone number in a church roster or Planning Center is a delivery candidate, not evidence that the person agreed to receive these texts.

## Your decisions and materials, in order

| Step | What you provide or decide | Why it matters |
| --- | --- | --- |
| 1. Sending organization | Decide whether the church itself sends under its own Twilio account/brand or Rooted sends on behalf of each church. Identify the legal entity shown in every SMS. | Twilio distinguishes a direct sender from a software platform sending for customers. If Rooted sends for multiple churches, review Twilio's [ISV onboarding model](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv); a distinct church profile/brand/campaign and sender may be needed. Do not register every church's traffic as a single generic Rooted campaign without validating that arrangement. |
| 2. Audience and country | List destination countries, expected recipients per church, study frequency, and whether the messages are purely study notifications or include fundraising/promotional content. | Sender type, registration, consent wording, pricing and rules depend on destination and message purpose. This guide uses a **US SMS pilot** as its working example. |
| 3. Paid account and sender | Create or upgrade the Twilio account. For a US local number, obtain a 10DLC number and register the sending brand and campaign. A toll-free number has a different verification path. | [Twilio's A2P 10DLC quickstart](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart) says trial accounts cannot complete 10DLC registration. [Toll-free verification](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding) is separate and must be approved before US/Canada toll-free sending. |
| 4. Registration evidence | Gather legal organization name, address, business/nonprofit type, registration/EIN details where applicable, website, contact details, use-case description, sample messages, exact opt-in method, opt-out/help method, and public privacy and terms URLs. | Twilio reviews the real sender and how recipients consent. The [business-information guide](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info) lists campaign fields; the [nonprofit guidance](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-for-government-and-non-profit-agencies) is relevant if the church is an eligible nonprofit. |
| 5. Consent process | Choose a recipient-controlled opt-in route, such as a church web form, paper form, or keyword flow. Preserve the exact wording/version, who consented, when, source and evidence reference. Give people a way to decline. | Twilio requires prior consent specific to the sender and message subject and proof that can be produced on request. The admin must not turn a roster import into consent automatically. [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy). |
| 6. Public policy pages | Publish privacy policy and messaging terms that match the sender and opt-in route; include message frequency, possible message/data rates, support contact, STOP/HELP instructions and treatment of mobile opt-in data. | Twilio's [A2P campaign guidance](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info) asks for accessible privacy/terms URLs and consistent opt-in language. Have the actual sender's policy owner review these pages. |
| 7. Messaging Service | Create a service, add the approved number to its sender pool, and record the `MG...` Messaging Service SID. Decide whether to enable Advanced Opt-Out. | A Messaging Service provides sender configuration and incoming-message behavior. [Twilio's service setup guide](https://www.twilio.com/docs/messaging/services) covers the sender pool, integration and compliance settings. |
| 8. Budget and pilot | Choose a monthly SMS segment budget and a small opted-in pilot group. Review the exact preview before sending. | Long text, Unicode punctuation and links can increase segments; Twilio bills by segment and may add number, registration and carrier charges. Check [current US pricing](https://www.twilio.com/en-us/sms/pricing/us) when budgeting. |

### Example consent wording to adapt

> “I agree to receive recurring Bible study text messages from **[registered church name]** at the number I provide. Messages will contain a short note and a link to a public study. Frequency: **[actual schedule or range]**. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. See **[privacy URL]** and **[terms URL]**.”

This is a **draft for the church and its policy reviewer**, not a representation that Twilio has approved it. The checkbox should be optional, initially unchecked, and separate from any general site terms. If consent was collected previously, compare its exact wording and evidence with the proposed study SMS program before reusing it. Twilio's policy requires the first message to include “Reply STOP to unsubscribe” or an equivalent standard opt-out instruction. [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy).

### Example registration description and SMS sample

**Campaign description:** “Opted-in recipients receive scheduled Bible study notifications from [registered church name]. Each text includes a short church-authored introduction and a link to a publicly readable study. Recipients may reply STOP to opt out or HELP for support.”

**Sample SMS:** “**[Church name]**: A new study from **[creator name]** — **[study title]**. Read it: **https://rooted-together.com/c/[church]/studies/[id]**. Reply STOP to unsubscribe.”

Use the church's real name, working site, actual consent flow and real sample content in the registration. If several churches send under distinct brands, prepare this material for each sender. The link should be Rooted's server-generated canonical public URL; the creator writes the introduction, not an arbitrary destination URL.

## Twilio Console sequence for a US 10DLC pilot

1. **Create/upgrade the account** and enable billing. A free trial can exercise restricted messaging, but Twilio's current trial documentation limits recipients and custom message bodies; use a paid account for the real creator-written study texts. [Twilio trial account guide](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).
2. **Choose the sender owner** from step 1 above. For one church sending its own texts, follow Twilio's [direct standard/low-volume guide](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-standard-onboarding). For Rooted sending on behalf of multiple churches, follow the [ISV architecture guide](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv) and decide the per-church account/profile layout before registration.
3. In Twilio Console, create the required **Customer/Compliance Profile**, register the **Brand**, then register the **Campaign** for study notifications. Supply the message flow, sample messages, opt-in evidence route, support and policy URLs. Wait for the campaign and number association to become approved/active; a submitted form is not authorization to send. [Twilio A2P quickstart](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart).
4. Create or use the Campaign's **Messaging Service**, add the registered 10DLC number to its sender pool and record the `MG...` SID. Set the service's incoming-message webhook for the Rooted callback so STOP can update Rooted's consent ledger. If Advanced Opt-Out is enabled, test its `OptOutType` events; Twilio notes it is **not enabled by default**. [Messaging Services](https://www.twilio.com/docs/messaging/services), [Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out).
5. Coordinate the public callback URL with the Rooted operator. The existing contract expects a POST to `https://rooted-together.com/api/v1/provider-callbacks/twilio/{churchId}/{connectionId}`; outbound status callbacks may append `?intentId=...`. The operator must generate the actual IDs and confirm that the public URL, proxy path and `APP_ORIGIN` match *exactly*, because Rooted validates Twilio's request signature against that URL. [Rooted provider contract](../../backend/contracts/PROVIDERS.md), [Twilio status callback guide](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status).
6. Provide the operator the **Account SID** (`AC...`), **Messaging Service SID** (`MG...`) or approved sending number, and the Account Auth Token through a secure secret handoff. Do not paste the Auth Token into a browser form, research document, support ticket or chat. The operator configures Azure secrets and the appropriate sender/tenant controls; you review the exact study text and activate only after registration, consent and a pilot test.

If you choose a toll-free sender instead, replace the A2P 10DLC brand/campaign path with Twilio's [toll-free verification procedure](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding), and verify its current requirements for your destinations. Do not assume one sender registration covers a different type of number or another country.

## What Rooted already has, and what still needs to be built

Rooted already contains a Twilio API adapter, a sender connection screen, encrypted phone contacts, a versioned consent ledger, suppressed-contact handling, approved SMS previews, send intents, status reconciliation and a signed callback route. The operator configuration includes `EXTERNAL_SERVICES_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM`, `TWILIO_CHURCH_ID`, `TWILIO_SENDER_SCOPE`, `TWILIO_ACTIVATION_APPROVED`, and the encryption key. See [provider runtime](../../backend/src/api/provider-routes.ts), [provider contract](../../backend/contracts/PROVIDERS.md), and [current delivery UI](../../frontend/components/delivery-center.tsx).

**Those controls do not yet make Option B work.** Current contacts have a required member-account foreign key, the delivery UI asks for a church member, and the Twilio runtime is scoped to one configured church ID and sender. The application also needs creator-written SMS notes with stable public links, a recipient model independent of sign-in, and multi-church sender mapping if multiple churches will send. The existing callback must be tested end to end for both delivery status and inbound STOP on the selected Messaging Service. If advanced opt-out handles STOP at Twilio, Rooted must still persist suppression; Twilio's [Advanced Opt-Out documentation](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out) describes the `OptOutType` webhook signal. These are engineering and deployment tasks, not fields you can complete in Twilio Console.

## Pilot acceptance: what to witness before broad sending

- A recipient who explicitly opted in receives **one** approved message from the expected church sender. Its link opens the correct public study on a phone without sign-in; forwarding it also works.
- A contact with no consent or an opted-out contact receives nothing. A reply of **STOP** blocks later sends in Twilio **and** Rooted; **HELP** returns the support path configured for the sender.
- A changed or withdrawn study does not trigger an outdated text. The sent body matches the approved preview, including the creator's note, title, link and opt-out line.
- Twilio's delivery callback is accepted, and Rooted shows the resulting provider status. “Queued” or “sent” is not proof that a person read the study; delivery evidence and study engagement remain separate.
- The operator reviews segment count, pilot cost, failed/undelivered messages and the monthly SMS limit before increasing the recipient list.

## The immediate checklist for you

1. Decide whether **each church** or **Rooted on behalf of churches** is the legal SMS sender; confirm the model with Twilio before registering multiple churches.
2. Choose a US local 10DLC or toll-free sender for the pilot and create/upgrade the appropriate Twilio account.
3. Gather the sender's legal details, website, privacy/terms URLs, study-SMS samples, consent flow, support contact and expected frequency.
4. Put the opt-in flow in place and retain evidence for every recipient; identify a small group that has actually opted in.
5. Submit the sender registration and wait for approval. Record the Account SID, approved number, Messaging Service SID and registration status.
6. Give the operator the identifiers and secure access to the Auth Token **after** the Option B application changes and callback configuration are ready. Review the exact SMS preview and approve a limited pilot.

No phone verification, member login registration, or Twilio Verify service is required for the **reader** in this option. SMS registration and consent still apply because the church is sending texts.
