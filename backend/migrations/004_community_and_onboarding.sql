ALTER TABLE discussions ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE discussions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE reports ADD FOREIGN KEY(church_id,reporter_id) REFERENCES memberships(church_id,user_id);
ALTER TABLE reports ADD CONSTRAINT report_reason_nonempty CHECK(length(trim(reason)) BETWEEN 1 AND 5000);
CREATE TABLE moderation_actions (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, discussion_id uuid NOT NULL,
  actor_id text NOT NULL, decision text NOT NULL CHECK(decision IN ('approve','hide')), reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,discussion_id) REFERENCES discussions(church_id,id),
  FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE discussion_revisions (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL, version integer NOT NULL,
  body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  UNIQUE(church_id,discussion_id,version), FOREIGN KEY(church_id,discussion_id) REFERENCES discussions(church_id,id)
);
CREATE TABLE invitations (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, target_subject text NOT NULL,
  role text NOT NULL, capabilities text[] NOT NULL, invited_by text NOT NULL, reason text NOT NULL,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,invited_by) REFERENCES memberships(church_id,user_id),
  CHECK(target_subject<>invited_by)
);
CREATE TABLE onboarding_commands (
  user_id text NOT NULL, key text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,key)
);
ALTER TABLE onboarding_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_commands FORCE ROW LEVEL SECURITY;
CREATE POLICY own_onboarding ON onboarding_commands USING (user_id=current_setting('app.user_id',true)) WITH CHECK (user_id=current_setting('app.user_id',true));
CREATE TABLE privacy_requests (
  church_id uuid NOT NULL, id uuid NOT NULL, user_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('export','erasure')),
  status text NOT NULL DEFAULT 'requested', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE FUNCTION lookup_invitation(lookup_hash text, subject text) RETURNS TABLE(church_id uuid,id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT church_id,id FROM invitations WHERE token_hash=lookup_hash AND target_subject=subject AND expires_at>now() AND revoked_at IS NULL AND accepted_at IS NULL
$$;
REVOKE ALL ON FUNCTION lookup_invitation(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_invitation(text,text) TO gather_runtime;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['moderation_actions','discussion_revisions','invitations','privacy_requests'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['moderation_actions','discussion_revisions'] LOOP
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_immutable_change()',table_name);
  END LOOP;
END $$;
CREATE INDEX pending_discussions ON discussions(church_id,status,created_at);
CREATE INDEX notifications_user_created ON notifications(church_id,user_id,created_at DESC);
CREATE INDEX pending_schedules_due ON schedules(church_id,due_at) WHERE status='pending';
