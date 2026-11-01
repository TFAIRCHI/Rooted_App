ALTER TABLE schedules ADD COLUMN created_by text;
ALTER TABLE schedules ADD FOREIGN KEY(church_id,created_by) REFERENCES memberships(church_id,user_id);
CREATE FUNCTION validate_approval_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_record revisions;
BEGIN
  SELECT * INTO revision_record FROM revisions WHERE church_id=NEW.church_id AND id=NEW.revision_id;
  IF revision_record.aggregate_id <> NEW.aggregate_id OR revision_record.hash <> NEW.hash
    OR revision_record.plan_approval_id IS DISTINCT FROM NEW.plan_approval_id OR revision_record.plan_hash IS DISTINCT FROM NEW.plan_hash THEN
    RAISE EXCEPTION 'approval dependency binding mismatch';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER approval_binding BEFORE INSERT ON approvals FOR EACH ROW EXECUTE FUNCTION validate_approval_binding();
