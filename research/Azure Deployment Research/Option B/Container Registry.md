# Container Registry — deployment images

## Function

The registry stores versioned Linux container images that Container Apps pulls to run the frontend, API and worker. An image distribution mechanism is required; **Azure Container Registry specifically is optional**. Multiple application images can share one suitable registry.

## Choices and costs

| Choice | Monthly price basis | Pros | Cons |
|---|---:|---|---|
| **ACR Basic** | **$0.1666/day**, approximately **$5.07** across 730 hours | Azure integration, private images, managed-identity access | Base charge while it exists; extra storage/build/transfer can add costs |
| Existing suitable external registry | **$0 additional Azure registry resource**; provider charges/allowances still apply | Can reuse a free/existing registry | Private storage/transfer/CI limits, credentials/access and image availability need checking |
| Higher ACR tiers | Separately metered | More capacity/networking/enterprise features | No demonstrated initial need in this pilot |

The earlier **$32.02 core estimate excluded ACR**. Selecting Basic explicitly makes it **$37.09 before AI and other excluded services**, not $32.02 plus a free registry. A 30-day month is about $5.00; the 730-hour comparison is about 30.42 days. [Retrieved meter](pricing/resource-rates-and-scenarios.json), [registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/).

## Cost minimization and deployment checks

Use one Basic registry or a validated existing registry; do not purchase one per church/process. Keep images small, remove obsolete image/build artifacts with a deliberate retention policy, and preserve at least a working rollback revision. Avoid paying for remote registry builds if the chosen CI pipeline already builds the images economically; CI minutes/artifacts still have limits.

Container Apps supports [public and private registries](https://learn.microsoft.com/en-us/azure/container-apps/containers). Private application images must exclude secret files, local databases and private content. Do not make a private image public merely to avoid a charge. Pin a deployment artifact/digest, validate access and rollback, and record provider storage/transfer terms before treating an external registry as free.
