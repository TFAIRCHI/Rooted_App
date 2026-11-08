ALTER TABLE provider_budgets ADD COLUMN guidance jsonb;
ALTER TABLE provider_budgets ADD COLUMN guidance_revision integer NOT NULL DEFAULT 0;
ALTER TABLE study_workflows ADD COLUMN create_series boolean NOT NULL DEFAULT false;
UPDATE study_workflows SET create_series=true WHERE series_id IS NULL;

CREATE TABLE church_ai_guidance_revisions (
  church_id uuid NOT NULL REFERENCES churches(id),
  revision integer NOT NULL,
  guidance jsonb NOT NULL,
  profile text NOT NULL,
  profile_hash text NOT NULL,
  actor_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,revision)
);
ALTER TABLE church_ai_guidance_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_ai_guidance_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON church_ai_guidance_revisions
  USING (church_id=nullif(current_setting('app.church_id',true),'')::uuid)
  WITH CHECK (church_id=nullif(current_setting('app.church_id',true),'')::uuid);
CREATE FUNCTION reject_guidance_revision_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Church AI guidance history is immutable'; END $$;
CREATE TRIGGER immutable_guidance_revision BEFORE UPDATE OR DELETE ON church_ai_guidance_revisions
  FOR EACH ROW EXECUTE FUNCTION reject_guidance_revision_change();
INSERT INTO church_ai_guidance_revisions(church_id,revision,guidance,profile,profile_hash)
  SELECT church_id,0,COALESCE(guidance,jsonb_build_object('principles','','boundaries','','voice','','standingInstructions',profile)),profile,md5(profile)
  FROM provider_budgets;
