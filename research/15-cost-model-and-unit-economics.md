# Cost model and unit economics

**Needed:** Reproducible assumptions and sensitivity, not a headline SaaS margin invented before vendor selection. **Recommendation:** Track per-tenant usage and separately meter/budget SMS, AI, transcription and storage. Prices below are narrow U.S. snapshots accessed 2026-10-18; verify before purchasing.

## Assumed example workload

One church, 500 opted-in recipients, 3 studies/week, 4.33 weeks/month, 1 sermon/week at 40 minutes, 1 weekly AI proposal, 3 day proposals, 3 full drafts, and 12 field-assistance requests per week. Each SMS has one or two segments; no promotional sends. Incoming messages, retries, exclusions, taxes and carrier routing are not included in the base arithmetic. The 4.33 conversion is an average planning assumption, not a calendar-month guarantee.

| Quantity | Formula | Example |
|---|---|---|
| Monthly study occurrences | `3 × 4.33` | 12.99 |
| Notification recipients | `500 × 3 × 4.33` | 6,495 attempted recipient messages |
| SMS segments | `recipients × averageSegments` | 6,495 at 1 segment; 12,990 at 2 |
| Transcription minutes | `40 × 4.33` | 173.2 |
| AI input tokens/week | `12k + 3×8k + 3×10k + 12×3k` | 102k maximum under assumed caps |
| AI output tokens/week | `2k + 3×1.5k + 3×2k + 12×0.6k` | 19.7k maximum under assumed caps |
| Monthly text-generation cost | `0.44166 × inputRatePerMillion + 0.085301 × outputRatePerMillion` | Rates remain **Unknown** until model selection; cached input billed separately if used |

These are requested-cap calculations, not measured token use. Source deduplication and field scoping may reduce use; retries or revising the entire week increase it. Record actual input/output/cached tokens and provider invoice IDs rather than projecting from characters.

## Verified price examples and their limits

| Provider / use | Snapshot | Example cost / limitation |
|---|---|---|
| Twilio U.S. SMS | $0.0083 base per incoming/outgoing segment; local number $1.15/month [S35](sources.md#s35) | 6,495 segments = $53.91 base; 12,990 = $107.82. Add number, carrier fees, registration, incoming/failed-message charges, tax and options |
| Clearstream | $119/month includes 6,000 credits and five local numbers [S40](sources.md#s40) | Assumed 6,495 one-credit recipients already exceed included credits; obtain overage/refill quote. Credits ≠ Twilio segments by assumption |
| Text In Church | Public pricing/credit pages conflict [S46](sources.md#s46), [S47](sources.md#s47), [S48](sources.md#s48) | **Unknown:** current applicable all-in price and credit accounting; obtain written quote |
| OpenAI transcription candidates | Estimated $0.003/min mini and $0.006/min standard [S50](sources.md#s50) | 173.2min = approximately $0.52 or $1.04/month before retries/media operations |
| Text model | Provider/model not selected | Use symbolic rates above; no invented “current” token price |
| Hosting, auth, logs, storage, queue | Provider/region/retention not selected | Quotes required; no claimed exact infrastructure cost |

Twilio and Clearstream are not directly comparable totals: they include different services/fees, use different unit accounting, and may require separate church accounts. Provider snapshots are documented in [12](12-scheduling-sms-and-notifications.md). None constitutes a compliance determination or guaranteed delivery rate.

## Sensitivity and break-even

At 100, 500 and 2,000 recipients with three sends/week, one-segment base Twilio arithmetic is approximately $10.78, $53.91 and $215.63/month before all additions. Doubling segments doubles this base send component. Emoji, curly punctuation, Unicode and longer links can change encoding/segment counts; display actual encoded preview estimates using the selected provider rules and validate with real test sends.

`Tenant contribution = subscriptionRevenue + usageRevenue − providerUsage − allocatedInfrastructure − supportCost − paymentFees − refunds`. `Gross margin = contribution / recognizedRevenue`, with consistent accounting for support and infrastructure. `Break-even tenants = fixedMonthlyCost / positiveAverageTenantContribution`. No result is calculated without revenue, support burden and hosting assumptions. **Recommendation:** Charge a predictable editorial subscription and pass through or cap messaging; do not promise unlimited SMS.

Model storage as `sermonMinutes × bitrate × retention + assetCopies + transcript/index bytes`; CDN/egress by actual reader traffic and file delivery; backups by retained versions; observability by event volume and sampling; auth by applicable active-user billing units. Source licenses, moderation/support labor, onboarding/registration, security reviews and taxes can dominate small API bills and must be included in a business case.

## Dependencies, alternatives, risks, unknowns

Alternative: church-owned provider billing; limits SaaS cash exposure but complicates onboarding/support. Alternative: pooled platform messaging; simplifies purchase but requires approved sender/consent isolation and commercial agreements. **Recommendation:** Prefer church-specific accounts/subaccounts/identities after vendor approval, with hard tenant budgets and pause controls. Dependencies: destination country, vendor quote, selected models, actual opt-in audience and support staffing. Risks: retries after ambiguous sends, auto-refill surprises, high carrier surcharge mix, doubling Unicode segments. **Unknown:** willingness to pay, expected expansion, payment processing, sales/acquisition cost, and rights fees. Phase 0 should produce a signed usage worksheet for each pilot church and replay its actual week through the calculator before setting price.
