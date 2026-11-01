# Domain and Networking — reachability and HTTPS

## Function

Namecheap DNS directs the purchased domain to the public frontend. Azure ingress accepts HTTPS; the frontend forwards API requests internally. PostgreSQL and identity connectivity complete the server path.

## Required versus optional cost

| Item | Initial treatment |
|---|---|
| Existing domain/DNS at Namecheap | Keep it; renewal is separate from Azure hosting |
| Container Apps custom hostname + managed certificate | No additional purchased certificate assumed, subject to Azure's issuance/renewal requirements |
| API internal HTTP ingress in the same environment | Use the platform capability; no separate API Management service required |
| Azure DNS | Optional; no migration from working Namecheap authoritative DNS needed |
| Front Door/CDN, Application Gateway, NAT/fixed egress, private endpoints | Optional architecture decisions, with charges to quote if selected |
| Internet egress/other network data transfer | Usage-based; not included in the $32.02 core subtotal |

The managed certificate requires the documented domain validation and accessibility conditions. A subdomain typically uses `CNAME app` and `TXT asuid.app`; use actual portal-generated values. [Custom-domain/certificate procedure](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates). Internal app communication is documented [here](https://learn.microsoft.com/en-us/azure/container-apps/connect-apps).

## Minimize cost without inventing a free network topology

Expose the frontend only where possible and keep API traffic internal. Keep compute/database in an appropriate common region; avoid paid edge services for a small pilot unless their features are required. Internal API ingress is not the same thing as a privately networked PostgreSQL server.

Choose database networking explicitly. Public PostgreSQL with TLS/restricted firewall rules and private networking have different security/operations/cost tradeoffs. Container outbound IP/firewall behavior must be validated; do not solve a connection problem by broadly enabling all Azure traffic without review. Private endpoints, selected environment features or fixed egress can add management/network fees. [Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing).

No networking invoice has been quoted here because the domain, region and topology are not selected. The lean baseline excludes those optional appliances; an approved topology must list every selected network resource and its price before provisioning. Budget alerts do not enforce that design automatically.
