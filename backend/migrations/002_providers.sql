CREATE TABLE provider_connections (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, provider text NOT NULL CHECK(provider IN ('pco','twilio')),
  owner_id text NOT NULL, status text NOT NULL, organization_id text, tokens_ciphertext text, webhook_ciphertext text,
  config jsonb NOT NULL DEFAULT '{}', expires_at timestamptz, last_sync_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,owner_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE provider_oauth_flows (
  church_id uuid NOT NULL, id uuid NOT NULL, connection_id uuid NOT NULL, actor_id text NOT NULL,
  state_hash text NOT NULL UNIQUE, verifier_ciphertext text NOT NULL, expires_at timestamptz NOT NULL,
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,connection_id) REFERENCES provider_connections(church_id,id)
);
CREATE TABLE provider_source_maps (
  church_id uuid NOT NULL, connection_id uuid NOT NULL, provider_id text NOT NULL, sermon_id uuid NOT NULL,
  source_id uuid, source_hash text, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,connection_id,provider_id),
  FOREIGN KEY(church_id,connection_id) REFERENCES provider_connections(church_id,id),
  FOREIGN KEY(church_id,sermon_id) REFERENCES sermons(church_id,id), FOREIGN KEY(church_id,source_id) REFERENCES sources(church_id,id)
);
CREATE TABLE provider_source_reviews (
  church_id uuid NOT NULL, source_id uuid NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,source_id), FOREIGN KEY(church_id,source_id) REFERENCES sources(church_id,id),
  FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE provider_budgets (
  church_id uuid PRIMARY KEY REFERENCES churches(id), monthly_limit integer NOT NULL CHECK(monthly_limit>0),
  period text NOT NULL, charged_tokens integer NOT NULL DEFAULT 0 CHECK(charged_tokens>=0),
  reserved_tokens integer NOT NULL DEFAULT 0 CHECK(reserved_tokens>=0), profile_version text NOT NULL,
  profile text NOT NULL, rights_confirmed boolean NOT NULL DEFAULT false,
  sms_segment_limit integer NOT NULL DEFAULT 0 CHECK(sms_segment_limit>=0), charged_sms_segments integer NOT NULL DEFAULT 0 CHECK(charged_sms_segments>=0),
  transcription_second_limit integer NOT NULL DEFAULT 0 CHECK(transcription_second_limit>=0), charged_transcription_seconds integer NOT NULL DEFAULT 0 CHECK(charged_transcription_seconds>=0)
);
CREATE TABLE provider_jobs (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, actor_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('ai','pco_sync','pco_disconnect','transcription')), status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL, result jsonb, error_code text, reservation integer NOT NULL DEFAULT 0,
  budget_period text, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id)
);
CREATE INDEX provider_jobs_pending ON provider_jobs(church_id,status,created_at);
CREATE TABLE provider_proposals (
  church_id uuid NOT NULL, id uuid NOT NULL, job_id uuid NOT NULL, aggregate_id uuid NOT NULL, base_revision_id uuid NOT NULL,
  proposal jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id), UNIQUE(church_id,job_id),
  FOREIGN KEY(church_id,job_id) REFERENCES provider_jobs(church_id,id),
  FOREIGN KEY(church_id,aggregate_id,base_revision_id) REFERENCES revisions(church_id,aggregate_id,id)
);
CREATE TABLE provider_adoptions (
  church_id uuid NOT NULL, id uuid NOT NULL, proposal_id uuid NOT NULL, revision_id uuid NOT NULL,
  actor_id text NOT NULL, fields jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,proposal_id) REFERENCES provider_proposals(church_id,id), FOREIGN KEY(church_id,revision_id) REFERENCES revisions(church_id,id)
);
CREATE TABLE provider_webhook_inbox (
  church_id uuid NOT NULL, id uuid NOT NULL, connection_id uuid NOT NULL, event_key text NOT NULL, body_digest text NOT NULL,
  payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id), UNIQUE(church_id,connection_id,event_key),
  FOREIGN KEY(church_id,connection_id) REFERENCES provider_connections(church_id,id)
);
CREATE TABLE provider_contacts (
  church_id uuid NOT NULL, id uuid NOT NULL, user_id text NOT NULL, phone_ciphertext text NOT NULL,
  phone_hash text NOT NULL, zone text, zone_source text, sender_scope text NOT NULL,
  consent_version integer NOT NULL DEFAULT 0, suppressed boolean NOT NULL DEFAULT true,
  PRIMARY KEY(church_id,id), UNIQUE(church_id,sender_scope,phone_hash),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE provider_consent_events (
  church_id uuid NOT NULL, id uuid NOT NULL, contact_id uuid NOT NULL, version integer NOT NULL, status text NOT NULL CHECK(status IN ('granted','revoked')),
  evidence jsonb NOT NULL, actor_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id), UNIQUE(church_id,contact_id,version),
  FOREIGN KEY(church_id,contact_id) REFERENCES provider_contacts(church_id,id)
);
CREATE TABLE provider_send_intents (
  church_id uuid NOT NULL, id uuid NOT NULL, connection_id uuid NOT NULL, publication_id uuid NOT NULL, contact_id uuid NOT NULL,
  actor_id text NOT NULL,
  approval_id uuid NOT NULL, preview_hash text NOT NULL, body text NOT NULL, consent_version integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', not_before timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  provider_sid text, delivery_events jsonb NOT NULL DEFAULT '[]', error_code text, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,publication_id,contact_id), UNIQUE(church_id,provider_sid),
  FOREIGN KEY(church_id,connection_id) REFERENCES provider_connections(church_id,id),
  FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id), FOREIGN KEY(church_id,contact_id) REFERENCES provider_contacts(church_id,id),
  FOREIGN KEY(church_id,approval_id) REFERENCES approvals(church_id,id)
);
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['provider_connections','provider_oauth_flows','provider_source_maps','provider_source_reviews','provider_budgets','provider_jobs','provider_proposals','provider_adoptions','provider_webhook_inbox','provider_contacts','provider_consent_events','provider_send_intents'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['provider_source_reviews','provider_proposals','provider_adoptions','provider_consent_events','provider_webhook_inbox'] LOOP
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_immutable_change()',table_name);
  END LOOP;
END $$;
