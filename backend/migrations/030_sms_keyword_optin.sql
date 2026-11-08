CREATE TABLE sms_keyword_optins (
  church_id uuid NOT NULL REFERENCES churches(id),
  sender_scope text NOT NULL,
  phone_hash text NOT NULL,
  phone_ciphertext text NOT NULL,
  requested_at timestamptz,
  unblocked_at timestamptz,
  expires_at timestamptz,
  PRIMARY KEY (church_id,sender_scope,phone_hash)
);
ALTER TABLE sms_keyword_optins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_keyword_optins FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sms_keyword_optins
  USING (church_id=nullif(current_setting('app.church_id',true),'')::uuid)
  WITH CHECK (church_id=nullif(current_setting('app.church_id',true),'')::uuid);
