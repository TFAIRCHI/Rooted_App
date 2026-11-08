CREATE TABLE email_invitations (
  church_id uuid NOT NULL REFERENCES churches(id),
  id uuid NOT NULL,
  first_name text NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (length(trim(last_name)) BETWEEN 1 AND 100),
  email text NOT NULL,
  role text NOT NULL,
  capabilities text[] NOT NULL,
  invited_by text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sending','accepted_by_provider','failed','unknown')),
  delivery_attempts integer NOT NULL DEFAULT 0,
  last_delivery_at timestamptz,
  accepted_subject text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id,id),
  FOREIGN KEY (church_id,invited_by) REFERENCES memberships(church_id,user_id),
  CHECK (email = lower(email))
);
CREATE UNIQUE INDEX email_invitations_one_pending_per_church_email
  ON email_invitations(church_id,email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE email_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_invitations
  USING (church_id=nullif(current_setting('app.church_id',true),'')::uuid)
  WITH CHECK (church_id=nullif(current_setting('app.church_id',true),'')::uuid);

CREATE FUNCTION lookup_email_invitation(lookup_hash text)
RETURNS TABLE(church_id uuid,id uuid,first_name text,last_name text,role text,church_name text,expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT invite.church_id,invite.id,invite.first_name,invite.last_name,invite.role,churches.name,invite.expires_at
  FROM email_invitations invite JOIN churches ON churches.id=invite.church_id
  WHERE invite.token_hash=lookup_hash AND invite.expires_at>now() AND invite.revoked_at IS NULL AND invite.accepted_at IS NULL
$$;
REVOKE ALL ON FUNCTION lookup_email_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_email_invitation(text) TO gather_runtime;

ALTER TABLE auth_sessions ADD COLUMN verified_email text;
ALTER TABLE auth_sessions ADD COLUMN claimed_email text;
ALTER TABLE auth_flows ADD COLUMN church_slug text;

CREATE TABLE email_invitation_challenges (
  church_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  subject text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  requested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,invitation_id,subject),
  FOREIGN KEY(church_id,invitation_id) REFERENCES email_invitations(church_id,id) ON DELETE CASCADE
);
ALTER TABLE email_invitation_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_invitation_challenges FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_invitation_challenges
  USING (church_id=nullif(current_setting('app.church_id',true),'')::uuid)
  WITH CHECK (church_id=nullif(current_setting('app.church_id',true),'')::uuid);
