# Secrets — credentials and application settings

## Function

The backend and worker need database/provider credentials; identity needs its registered confidential-client settings; encryption material protects supported stored integrations. The public frontend must not receive database passwords or model keys.

## Choices and costs

| Choice | Cost treatment | Pros | Cons |
|---|---|---|---|
| Container Apps built-in secrets | **No separate Key Vault resource in the lean model** | Supported platform feature; fewest resources | Per-application management and rotation process still needed |
| Azure Key Vault references + managed identity | Additional metered service; quote selected operations/features | Central rotation/access/lifecycle management | Additional configuration/permissions and bill; not necessary simply to serve a custom domain |
| Secrets embedded in images, exported frontend or repository | Rejected | None for this architecture | Exposes credentials; not a valid saving |

Container Apps supports both direct secrets and Key Vault references. Updating a secret requires the documented revision restart/deployment behavior; it does not automatically update every running revision. [Microsoft secret management guidance](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets).

## Pilot approach

Use built-in server-side secrets initially, keep migration credentials separate from the restricted runtime role, and grant each process only the values it needs. Preserve the existing model deployment and application budget controls. Register production callback/origin values explicitly; prevent development persona/fixture settings from reaching production.

No `.env` file, key or existing secret value was inspected or changed for this research. Choosing built-in secrets avoids an extra service but does not remove the work of access control, rotation, recovery and secret-free builds/logs. Upgrade to Key Vault when actual operational or policy needs justify its measured cost.
