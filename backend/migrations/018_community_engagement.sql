ALTER TABLE discussions ADD COLUMN kind text NOT NULL DEFAULT 'response' CHECK(kind IN ('response','question','reply'));
ALTER TABLE discussions ADD COLUMN parent_id uuid;
ALTER TABLE discussions ADD COLUMN parent_content_version integer;
ALTER TABLE discussions ADD COLUMN content_version integer NOT NULL DEFAULT 1;
ALTER TABLE discussions ADD COLUMN resolved_at timestamptz;
ALTER TABLE discussions ADD COLUMN resolved_by text;
ALTER TABLE discussions ADD COLUMN resolution_kind text CHECK(resolution_kind IN ('reply','manual'));
ALTER TABLE discussions ADD CONSTRAINT discussion_publication_identity UNIQUE(church_id,publication_id,id);
ALTER TABLE discussions ADD FOREIGN KEY(church_id,publication_id,parent_id) REFERENCES discussions(church_id,publication_id,id);
ALTER TABLE discussions ADD FOREIGN KEY(church_id,resolved_by) REFERENCES memberships(church_id,user_id);
ALTER TABLE discussions ADD CONSTRAINT discussion_parent_kind CHECK((kind='reply')=(parent_id IS NOT NULL));
ALTER TABLE discussions ADD CONSTRAINT discussion_status CHECK(status IN ('pending','approved','hidden','erased','declined'));
ALTER TABLE moderation_actions DROP CONSTRAINT moderation_actions_decision_check;
ALTER TABLE moderation_actions ADD CONSTRAINT moderation_actions_decision_check CHECK(decision IN ('approve','hide','decline'));
CREATE TABLE discussion_evaluations (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL, content_version integer NOT NULL,
  policy_version text NOT NULL, input_hash text NOT NULL, verdict text NOT NULL CHECK(verdict IN ('policy_violation','needs_review')),
  reason_codes jsonb NOT NULL, origin text NOT NULL DEFAULT 'local_policy_rules', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,discussion_id,content_version,policy_version),
  FOREIGN KEY(church_id,discussion_id) REFERENCES discussions(church_id,id) ON DELETE CASCADE
);
CREATE TABLE discussion_resolutions (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL, content_version integer NOT NULL,
  actor_id text NOT NULL, decision text NOT NULL CHECK(decision IN ('resolve','reopen')), reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,discussion_id) REFERENCES discussions(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE publication_audiences (
  church_id uuid NOT NULL, publication_id uuid NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
  member_count integer NOT NULL DEFAULT 0 CHECK(member_count>=0), eligibility_version text NOT NULL DEFAULT 'active-member-only-v1',
  retired_at timestamptz, archived_unique_opens integer, archived_audience_opens integer,
  PRIMARY KEY(church_id,publication_id), FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id) ON DELETE CASCADE
);
CREATE TABLE publication_audience_members (
  church_id uuid NOT NULL, publication_id uuid NOT NULL, user_id text NOT NULL,
  PRIMARY KEY(church_id,publication_id,user_id),
  FOREIGN KEY(church_id,publication_id) REFERENCES publication_audiences(church_id,publication_id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE study_opens (
  church_id uuid NOT NULL, publication_id uuid NOT NULL, user_id text NOT NULL, first_opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,publication_id,user_id),
  FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE INDEX discussion_questions ON discussions(church_id,publication_id,status,kind,resolved_at);
CREATE INDEX discussion_order ON discussions(church_id,publication_id,created_at,id);
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['discussion_evaluations','discussion_resolutions','publication_audiences','publication_audience_members','study_opens'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
END $$;
