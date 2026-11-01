CREATE OR REPLACE FUNCTION validate_revision_dependency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aggregate_record aggregates; approval_record approvals;
BEGIN
  SELECT * INTO aggregate_record FROM aggregates WHERE church_id=NEW.church_id AND id=NEW.aggregate_id;
  IF aggregate_record.kind='plan' AND NEW.plan_approval_id IS NOT NULL THEN RAISE EXCEPTION 'plan cannot depend on plan approval'; END IF;
  IF aggregate_record.kind='content' AND NEW.plan_approval_id IS NOT NULL THEN
    SELECT * INTO approval_record FROM approvals WHERE church_id=NEW.church_id AND id=NEW.plan_approval_id;
    IF approval_record.id IS NULL OR approval_record.aggregate_id <> aggregate_record.plan_id OR approval_record.hash <> NEW.plan_hash THEN
      RAISE EXCEPTION 'content approval must reference its own plan';
    END IF;
  END IF;
  RETURN NEW;
END $$;
