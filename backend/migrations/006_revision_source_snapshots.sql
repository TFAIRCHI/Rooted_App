ALTER TABLE revisions ADD COLUMN source_snapshot jsonb;
ALTER TABLE revisions ADD CONSTRAINT canonical_source_binding CHECK (
  (canonical_bytes::jsonb->>'schemaVersion')::integer < 2 OR
  (source_snapshot IS NOT NULL AND canonical_bytes::jsonb->'sourceSnapshot'=source_snapshot)
);
CREATE FUNCTION require_source_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.canonical_bytes::jsonb->>'schemaVersion')::integer<>2 OR NEW.source_snapshot IS NULL THEN
    RAISE EXCEPTION 'new revisions require source snapshot canonical version 2';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER source_snapshot_binding BEFORE INSERT ON revisions FOR EACH ROW EXECUTE FUNCTION require_source_snapshot();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON sources FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
