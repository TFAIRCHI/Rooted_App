-- Reading sessions have no application expiry. Privileged assurance expires independently.
ALTER TABLE auth_sessions ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE auth_sessions ADD COLUMN mfa_verified_until timestamptz;
ALTER TABLE auth_flows ADD COLUMN access text NOT NULL DEFAULT 'member'
  CHECK (access IN ('member','contributor'));
ALTER TABLE auth_flows ADD COLUMN prior_user_id text;
ALTER TABLE auth_flows ADD COLUMN prior_session_hash text;

-- Existing sessions keep their original expiry and gain no implicit MFA assurance.
