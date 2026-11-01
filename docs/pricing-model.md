# Rooted pricing working model

Prepared October 25, 2026. Proposed commercial policy for discussion, not an implemented offer. Assumes U.S. churches, USD, and self-service use with bounded email support. Church segment, actual Azure billing rates, infrastructure costs, support demand and willingness to pay remain unconfirmed. No application behavior or public pricing was changed.

## Recommendation

Test **$79/church/month**, or **$790/year paid upfront**, for one church workspace and one primary weekly study program. Offer the first 10 suitable pilot churches **$49/month for their first 12 paid months**, with the subsequent $79 price disclosed at enrollment. Start paid service only when the promised production experience is available. Use a four-week evaluation after onboarding so churches experience several Sunday-to-weekday cycles; define it before publishing an offer.

Use one public paid plan initially. Keep a **$149/month ministry-team option** as a later hypothesis for churches running up to three distinct weekly study programs, after demand and delivery cost are demonstrated. A program means a separate recurring teaching track, such as adult congregation, youth and small groups; days, revisions and campuses sharing the same material do not create extra programs. This commercial unit is not currently enforced in code.

Include member reading, browser-based listening, staff collaboration, pastoral approval, publication, existing branding and moderated community features in the base plan. Include a measured AI allowance. Do not charge per reader, reviewer or comment, and do not put review, security, export or basic accessibility behind a more expensive tier. Very large audiences require a capacity review before agreeing to service terms; unlimited commercial reader seats do not establish unlimited infrastructure capacity.

Charge SMS separately. Avoid a permanent free church workspace until acquisition, support and conversion economics justify one. Retain the public sample study as the inexpensive way to explore the product. Offer a limited scholarship budget if affordable rather than discounting every account indefinitely.

## What the application supports

This assessment combines source review with existing dated execution evidence; it is not a fresh runtime, usability or production certification.

| Area | Observed capability and pricing implication |
| --- | --- |
| Weekly study creation | Sermons, reviewed sources, dated plans and complete studies. Recurring weekly work supports recurring church billing. |
| Guided AI Study Co-writer | Conversational planning, editable direction, explicit generation confirmation, saved drafts and durable jobs. Saves preparation work but still requires church judgment and review. |
| Editorial control | Independent plan/content approval, revision binding, scoped permissions and publication controls. A meaningful candidate differentiator, subject to buyer interviews. |
| Member experience | Mobile reading, browser speech, reactions, moderated discussion and church branding. Lets the buyer deliver an ongoing experience rather than download generated text. |
| Administration | Church creation/joining, memberships, tenant isolation, provider budgets and privacy workflows. Useful foundations for church subscriptions. |
| Integrations | Azure co-writer has specific live acceptance evidence. Planning Center import, transcription and Twilio have separate activation/validation requirements; do not sell those as universally available live integrations. |
| Commercial infrastructure | No subscription checkout, recurring billing, invoice lifecycle or commercial entitlement system was found in the reviewed application/migrations. Provider token budgets are not subscription billing. |

The root README and initial acceptance matrix lag newer work. The October 24 guided-workflow report records six successful live Azure calls totaling 10,526 input/output tokens across synthetic single-day and three-day journeys. That demonstrates a working bounded flow, not representative monthly consumption. The October 25 member report records listening/community improvements and passing focused checks, while explicitly limiting the scope of browser regression evidence. Browser speech adds no application-paid speech-generation call in the current implementation; device behavior varies.

Evidence: [root overview](../README.md), [guided workflow](../BuildPrompts/1.2.12/evidence/execution.md), [current public-site implementation](../BuildPrompts/1.2.13/evidence/execution.md), [member listening/community](member-listening-and-community.md), [provider contracts](../backend/src/integrations/README.md), [usage budget schema](../backend/migrations/002_providers.sql), [original cost research](../research/15-cost-model-and-unit-economics.md).

Positioning to test: **“Turn Sunday's teaching into a week of church-approved studies your people can read, hear and discuss.”** The economic buyer is likely the pastor, discipleship leader or administrator; contributors and members are users. Initial customer hypothesis: churches with roughly 100–500 attendees, a named study owner and a separate available reviewer. A very small team without review capacity may find the current process difficult regardless of price.

## Current price anchors

Official public pages checked October 25, 2026. Compare monthly billing with monthly billing; annual discounts are separate.

| Product | Published pricing | Relevance |
| --- | --- | --- |
| [Pulpit AI](https://www.pulpitai.com/pricing) | Basic $39/month, Standard $59/month; Basic includes five uploads/month, devotionals and discussion guides | Direct competition for the sermon-content budget. |
| [Sermon Shots](https://sermonshots.com/pricing/) | Silver Suite $67/month or $684/year, including discussion guides and five-day devotionals | Generation alone will struggle to justify a large premium. |
| [Breeze/Tithely ChMS](https://www.breezechms.com/pricing) | $72/month for church management; giving processing is separate | Adjacent church-software budget anchor, not an equivalent workflow. |
| [Clearstream](https://clearstream.io/pricing) | U.S. $35/month for 1,000 credits; $119/month for 6,000 credits | Shows why messaging should have a separate budget. Credits are vendor-defined. |

Inference: $79 is a reasonable experiment if buyers value the shared editorial process and member experience. These comparisons do not prove willingness to pay. Higher pricing requires evidence of repeat use, time saved and acceptable support cost. Avoid claiming spiritual outcomes from engagement counts.

## Proposed packaging

| Offer | Proposed price | Boundaries |
| --- | --- | --- |
| Founding church | $49/month for 12 paid months, then disclosed standard price | First 10 qualified churches; base plan; feedback participation; no lifetime discount. |
| Rooted Church | $79/month or $790/year | One workspace, one primary weekly study program, all core editorial/member features, bounded AI, email support. |
| Ministry Team, later | Test $149/month or $1,490/year | Up to three recurring programs within a church; release only after demand, cost and entitlement support are validated. Separate churches remain separate tenants. |
| Assisted launch, optional | Test $199 once | A bounded 90-minute setup/training session, church configuration and a first-week walkthrough; no unlimited migration or writing service. |
| SMS, later | Separately authorized provider costs; possible disclosed management fee | No included unlimited texts; sender/registration charges and usage accounted for separately. |

Annual billing at ten monthly payments is a 16.7% discount. Evaluate annual accounts using monthly recognized revenue ($65.83 for the $790 plan), not upfront cash. Do not stack the annual discount with founding pricing. Avoid annual prepayment during an unstable pilot; test repeat use first.

Before selling an AI allowance, replay real pilot workloads. A candidate base workload is one teaching program producing up to five studies per week, including five-Sunday months, ordinary planning conversation and reasonable revisions. That workload is a design target, not an existing quota or promise. Set the actual dollar budget and understandable allowance from measured input/output tokens, failed requests and retries. Large revisions and additional programs need explicit allowances. Notify at 80% and 100%, ask before paid top-ups, and pause generation at the agreed cap; existing drafts, review and member reading should remain usable. Do not expose raw tokens as the main customer-facing unit or promise unlimited AI.

## Unit economics

The companion [editable CSV](pricing-scenarios.csv) contains spreadsheet formulas. Columns through K are editable assumptions; L–T calculate monthly economics. Open/import in Excel or another formula-capable spreadsheet. All costs below are planning assumptions, not provider quotes. The 3% + $0.30 payment assumption is a placeholder, not a verified processor rate, and excludes any extra billing-product fee. Replace it with actual terms.

Base monthly direct costs per church, excluding SMS: AI $5, variable infrastructure/auth/storage $5, 15 support minutes at $40/hour = $10, and a $3 contingency allocation. That is $23 before payment fees. Shared fixed infrastructure must be in the fixed-cost line instead of being counted again here. The contingency is a planning buffer, not an asserted accounting expense.

| Scenario | Monthly recognized revenue | Direct cost including assumed payment fee | Contribution | Contribution margin |
| --- | ---: | ---: | ---: | ---: |
| Founder, base use | $49.00 | $24.77 | $24.23 | 49.4% |
| Standard, base use | $79.00 | $25.67 | $53.33 | 67.5% |
| Standard annual, base use | $65.83 | $25.00 | $40.83 | 62.0% |
| Standard, heavier support/use | $79.00 | $57.42 | $21.58 | 27.3% |
| $99 price test, base use | $99.00 | $26.27 | $72.73 | 73.5% |

Heavier-use assumptions: AI $8, variable infrastructure $10, 45 support minutes at $45/hour = $33.75, contingency $3. Annual payment fees assume one $790 transaction annually, with its percentage fee and $0.30 fixed fee allocated across 12 months.

Use contribution margin as a management measure here; this model includes a buffer and does not claim a formally reported gross margin. Initially seek at least 65% contribution margin on standard monthly accounts, with a path toward 75% as onboarding and support improve. At $79, a 75% margin permits only $17.08 of non-payment direct costs; the $23 base assumption misses that target. Keeping those costs at $23 requires about $106/month for 75% under the assumed fee schedule. That is a reason to measure support and test $99–$109, not assume high SaaS margins.

At $79 and base costs:

- 20 churches: $1,580 MRR and $1,066.60 contribution before shared fixed expenses and founder compensation.
- 100 churches: $7,900 MRR and $5,333 contribution before those expenses.
- $1,000/month shared fixed overhead: 19 standard monthly churches to cover it.
- $1,000 overhead plus $5,000 founder compensation: 113 standard monthly churches to cover both.

These are steady-state scenarios with no founding/annual mix, churn, acquisition spend, onboarding spikes or SMS. Include those before treating the model as a business forecast. Track customer acquisition cost separately; a proposed six-month payback ceiling at $53.33 monthly contribution allows about $320 acquisition cost, including sales labor. Do not infer lifetime value without credible retention data.

Cost formula: `monthly contribution = recognized subscription revenue - AI - variable infrastructure - support labor - contingency - allocated payment fees`. Break-even is the ceiling of shared fixed cost divided by positive contribution. Do not count owner support labor both in direct support and again in founder compensation; split compensation between service delivery and other founder work.

Actual AI costing must use the configured Azure deployment's regional/account rate and separate input, output and cached-input usage. The code's deployment name is not an invoice rate. The small live acceptance ledger and the older research workload are different workloads and must not be substituted for measured production usage. Additional costs to quote include identity active-user charges, logs, backup retention, egress, source/translation rights, security operations and outbound email if introduced.

## Why SMS must be separate

[Twilio's current U.S. page](https://www.twilio.com/en-us/sms/pricing/us) lists $0.0083 per outbound SMS segment, plus carrier fees. The displayed long-code outbound carrier fees span $0.0035–$0.005 per segment. Combined variable send costs are roughly $0.0118–$0.0133 per segment before number rental, registration, replies, failed-message charges, tax or optional services. These are provider costs, not proposed customer prices.

At three notifications/week and 4.33 weeks/month:

| Opted-in recipients | Recipient messages/month | One-segment variable send cost | Two-segment variable send cost |
| --- | ---: | ---: | ---: |
| 100 | 1,299 | $15.33–$17.28 | $30.66–$34.55 |
| 500 | 6,495 | $76.64–$86.38 | $153.28–$172.77 |
| 2,000 | 25,980 | $306.56–$345.53 | $613.13–$691.07 |

Encoding, punctuation and length change segment counts. A full devotional should be read on its study page; use an approved short invitation/link for notification. Three sends per week is an assumption, not every calendar month's exact count.

Initial commercial direction: use a church-specific provider identity/account arrangement when supported and approved, with provider usage paid separately and a hard monthly budget. Direct church provider billing is a proposed operating arrangement, not confirmed current onboarding functionality. If Rooted later collects usage charges, reconcile actual billed segments, carrier fees, inbound traffic, failures and fixed fees. Any markup or management fee must cover processing and support and be disclosed before purchase. Do not publish a single guaranteed all-in segment price before the route/account economics are verified. Clearstream's credits are not interchangeable with Twilio segments; Clearstream is not a currently implemented adapter.

## Pilot and launch decisions

1. Recruit five to ten churches in one initial segment. Record attendance, active audience, current tools, teaching programs, buyer and reviewer availability.
2. Observe the existing weekly process. Measure staff preparation/review time, what would be replaced, and actual discretionary software budget. Test concrete $49/$79/$99 offers with comparable prospects; do not treat polite interest as conversion.
3. Run a four-week evaluation with production-ready core scope. Record weekly draft completion, approval/publication, recurring church use, voluntarily used member reading, support minutes and actual provider cost. Record time saved without assuming it is cash saved.
4. Seek an actual paid continuation at the stated price. Example decision gate: at least three of five comparable evaluated churches pay, and at least four publish during three of four weeks. These are proposed go/no-go criteria, not statistically proven market thresholds.
5. If accounts regularly need more than 15 minutes/month of support, first improve onboarding; consider paid assistance and a $99–$109 price test. If they only want generated text, test a narrower product instead of assuming a premium workflow price.
6. Publish one standard offer once conversion, cost, capacity and repeat use support it. Define cancellation, renewal notice, annual refund policy, scholarship eligibility and usage limits before taking payment.

Before commercial launch, complete the existing production identity/hosting/provider requirements for the scope actually sold. Implement church-level subscription state, plan/allowance enforcement, invoice/payment reconciliation, idempotent billing webhooks and an admin billing screen. Define trial, active, past-due, canceled and grace/read/export behavior; payment failure should not unexpectedly remove member access or church data. Manual invoicing can serve a small paid pilot, but access and usage still need explicit administration and written terms. Production capacity needs actual measurement; current documentation's test envelope is not a service guarantee.

Open decisions: first church segment and country; desired support model; whether the product replaces a current spend or adds one; monthly operating budget; target founder income; actual Azure/hosting/identity rates; whether texting is essential to the buying decision. Resolve these with the user and pilots before treating this proposal as final pricing.
