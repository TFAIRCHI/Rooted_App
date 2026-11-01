# Monitoring — health, logs and spending

## Function

Monitoring shows whether the website, API, worker and database are healthy; whether jobs are stuck; and whether charges are growing. It must not expose private study/co-writer content or credentials.

## Cost treatment

The **$32.02** core example contains no assumed Log Analytics ingestion, Application Insights telemetry, paid alert rules, extended retention or diagnostic exports. Those selections are additional potential cost sources; “recommended monitoring” is not a priced Azure service by itself.

| Approach | Pros | Cons / cost implications |
|---|---|---|
| Small explicit log retention and selected diagnostics | Lower ingestion/retention; easier review | Requires choosing useful error/latency/job metrics rather than collecting everything |
| Full debug/request traces and long retention | Detailed history | Potentially high ingestion/retention costs and unnecessary private data |
| Cost Management budgets/notifications | Spending visibility | Not a hard cap; billing data and notifications are delayed |
| No operational evidence | No deliberately selected logging service bill | Leaves no reliable way to diagnose failures or prove safe behavior; not recommended |

## Minimum pilot review

Track API health/readiness, database CPU credits/connections/storage, worker last successful claim, job failures/unknown submissions, actual replica allocation and model usage. Bound logs and redact payloads. Use a budget appropriate to the selected configuration and review actual charges after a week.

Microsoft explicitly notes that [budget notifications do not stop resources or spending](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets). Replica caps, finite work and application model limits must be enforced separately. Automated shutdown has availability implications and is not configured by this research.
