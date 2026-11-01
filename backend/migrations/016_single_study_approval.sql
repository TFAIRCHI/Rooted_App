-- New content revisions may retain historical plan provenance, but publication
-- eligibility is bound only to the approved study revision.
CREATE OR REPLACE FUNCTION validate_revision_dependency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aggregate_record aggregates;
BEGIN
  SELECT * INTO aggregate_record FROM aggregates WHERE church_id=NEW.church_id AND id=NEW.aggregate_id;
  IF aggregate_record.kind='plan' AND NEW.plan_approval_id IS NOT NULL THEN
    RAISE EXCEPTION 'plan cannot depend on plan approval';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validate_approval_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_record revisions;
BEGIN
  SELECT * INTO revision_record FROM revisions WHERE church_id=NEW.church_id AND id=NEW.revision_id;
  IF revision_record.aggregate_id <> NEW.aggregate_id OR revision_record.hash <> NEW.hash
    OR revision_record.plan_approval_id IS DISTINCT FROM NEW.plan_approval_id OR revision_record.plan_hash IS DISTINCT FROM NEW.plan_hash THEN
    RAISE EXCEPTION 'approval dependency binding mismatch';
  END IF;
  RETURN NEW;
END $$;

CREATE INDEX IF NOT EXISTS publications_content_revision_idx
  ON publications(church_id, content_id, revision_id, approval_id);
