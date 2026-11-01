ALTER TABLE privacy_requests ADD COLUMN completed_by text;
ALTER TABLE privacy_requests ADD COLUMN completed_at timestamptz;
ALTER TABLE privacy_requests ADD COLUMN retention_review_at timestamptz;
ALTER TABLE privacy_requests ADD COLUMN fulfillment jsonb;
ALTER TABLE privacy_requests ADD FOREIGN KEY(church_id,completed_by) REFERENCES memberships(church_id,user_id);
ALTER TABLE churches ADD COLUMN appeal_contact text;
CREATE TABLE participation_restrictions (
  church_id uuid NOT NULL, user_id text NOT NULL, restricted_until timestamptz NOT NULL,
  reason text NOT NULL, restricted_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,user_id), FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,restricted_by) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE privacy_tombstones (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, subject_hash text NOT NULL,
  request_id uuid NOT NULL, purpose text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,subject_hash), FOREIGN KEY(church_id,request_id) REFERENCES privacy_requests(church_id,id)
);
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['participation_restrictions','privacy_tombstones'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON privacy_tombstones FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
