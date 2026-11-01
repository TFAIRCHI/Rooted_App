CREATE TABLE study_review_requests (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  content_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  revision_hash text NOT NULL,
  requested_by text NOT NULL,
  approver_id text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','changes_requested','withdrawn','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  PRIMARY KEY(church_id,id),
  UNIQUE(church_id,content_id,revision_id),
  FOREIGN KEY(church_id,content_id) REFERENCES aggregates(church_id,id),
  FOREIGN KEY(church_id,revision_id,revision_hash) REFERENCES revisions(church_id,id,hash),
  FOREIGN KEY(church_id,requested_by) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,approver_id) REFERENCES memberships(church_id,user_id)
);
ALTER TABLE study_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_review_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON study_review_requests USING (church_id = nullif(current_setting('app.church_id',true),'')::uuid) WITH CHECK (church_id = nullif(current_setting('app.church_id',true),'')::uuid);

UPDATE memberships SET capabilities=ARRAY[
  'workspace:read','sermons:create','series:manage','plans:edit','content:edit','comments:write','ai:use',
  'theme:manage','settings:manage','memberships:manage','privacy:manage','audit:read','plans:approve',
  'content:approve','publication:schedule','moderation:manage'
] WHERE active AND 'plans:edit'=ANY(capabilities);
