-- Expiring, single-use OIDC flow binds the chosen public onboarding destination.
-- Additive: existing in-flight logins continue with the default destination.
ALTER TABLE auth_flows ADD COLUMN continuation text;
