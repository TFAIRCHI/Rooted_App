BEGIN;

CREATE SCHEMA church_design;
SET LOCAL search_path = church_design, pg_catalog;

CREATE TYPE plan_state AS ENUM
  ('Draft', 'In Review', 'Changes Requested', 'Approved', 'Cancelled');
CREATE TYPE content_state AS ENUM
  ('Draft', 'In Review', 'Changes Requested', 'Approved', 'Scheduled', 'Published', 'Cancelled');
CREATE TYPE schedule_state AS ENUM ('Pending', 'Cancelled', 'Published');
CREATE TYPE delivery_state AS ENUM
  ('Pending', 'Dispatching', 'Accepted', 'Delivered', 'Unknown', 'Failed', 'Suppressed');

CREATE TABLE church (
  church_id uuid PRIMARY KEY,
  name text NOT NULL,
  time_zone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  identity_subject text NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, identity_subject)
);

CREATE TABLE sermon (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  title text NOT NULL,
  preached_on date,
  source_manifest jsonb NOT NULL,
  source_version bigint NOT NULL DEFAULT 1 CHECK (source_version > 0),
  PRIMARY KEY (church_id, id)
);

CREATE TABLE weekly_series (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  title text NOT NULL,
  week_anchor date NOT NULL,
  time_zone text NOT NULL,
  PRIMARY KEY (church_id, id)
);

CREATE TABLE series_sermon (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  series_id uuid NOT NULL,
  sermon_id uuid NOT NULL,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, series_id, sermon_id),
  FOREIGN KEY (church_id, series_id) REFERENCES weekly_series(church_id, id),
  FOREIGN KEY (church_id, sermon_id) REFERENCES sermon(church_id, id)
);

CREATE TABLE dated_slot (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  series_id uuid NOT NULL,
  local_date date NOT NULL,
  local_time time NOT NULL,
  time_zone text NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (church_id, id),
  FOREIGN KEY (church_id, series_id) REFERENCES weekly_series(church_id, id)
);

CREATE TABLE plan (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  slot_id uuid NOT NULL,
  head_revision_id uuid,
  state plan_state NOT NULL DEFAULT 'Draft',
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, slot_id),
  FOREIGN KEY (church_id, slot_id) REFERENCES dated_slot(church_id, id)
);

CREATE TABLE plan_revision (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  plan_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  canonical_version integer NOT NULL CHECK (canonical_version > 0),
  canonical_payload bytea NOT NULL,
  payload jsonb NOT NULL,
  revision_hash bytea NOT NULL CHECK (octet_length(revision_hash) = 32 AND revision_hash = sha256(canonical_payload)),
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, plan_id, revision_number),
  UNIQUE (church_id, plan_id, id),
  UNIQUE (church_id, plan_id, id, revision_hash),
  FOREIGN KEY (church_id, plan_id) REFERENCES plan(church_id, id),
  FOREIGN KEY (church_id, author_id) REFERENCES membership(church_id, id)
);

ALTER TABLE plan ADD FOREIGN KEY (church_id, id, head_revision_id)
  REFERENCES plan_revision(church_id, plan_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE plan_approval (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  plan_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  revision_hash bytea NOT NULL,
  approver_id uuid NOT NULL,
  policy_version text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, plan_id, id, revision_hash),
  FOREIGN KEY (church_id, plan_id, revision_id, revision_hash)
    REFERENCES plan_revision(church_id, plan_id, id, revision_hash),
  FOREIGN KEY (church_id, approver_id) REFERENCES membership(church_id, id)
);

CREATE TABLE content (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  plan_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('web', 'email', 'sms')),
  locale text NOT NULL,
  head_revision_id uuid,
  live_publication_id uuid,
  state content_state NOT NULL DEFAULT 'Draft',
  needs_plan_rebase boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, id, plan_id),
  UNIQUE (church_id, plan_id, channel, locale),
  FOREIGN KEY (church_id, plan_id) REFERENCES plan(church_id, id)
);

CREATE TABLE content_revision (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  content_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  plan_approval_id uuid NOT NULL,
  plan_hash bytea NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  canonical_version integer NOT NULL CHECK (canonical_version > 0),
  canonical_payload bytea NOT NULL,
  payload jsonb NOT NULL,
  revision_hash bytea NOT NULL CHECK (octet_length(revision_hash) = 32 AND revision_hash = sha256(canonical_payload)),
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, content_id, revision_number),
  UNIQUE (church_id, content_id, id),
  UNIQUE (church_id, content_id, id, revision_hash, plan_approval_id, plan_hash),
  FOREIGN KEY (church_id, content_id, plan_id) REFERENCES content(church_id, id, plan_id),
  FOREIGN KEY (church_id, plan_id, plan_approval_id, plan_hash)
    REFERENCES plan_approval(church_id, plan_id, id, revision_hash),
  FOREIGN KEY (church_id, author_id) REFERENCES membership(church_id, id)
);

ALTER TABLE content ADD FOREIGN KEY (church_id, id, head_revision_id)
  REFERENCES content_revision(church_id, content_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE content_approval (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  content_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  revision_hash bytea NOT NULL,
  plan_approval_id uuid NOT NULL,
  plan_hash bytea NOT NULL,
  approver_id uuid NOT NULL,
  policy_version text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, content_id, revision_id, id),
  FOREIGN KEY (church_id, content_id, revision_id, revision_hash, plan_approval_id, plan_hash)
    REFERENCES content_revision(church_id, content_id, id, revision_hash, plan_approval_id, plan_hash),
  FOREIGN KEY (church_id, approver_id) REFERENCES membership(church_id, id)
);

CREATE TABLE approval_revocation (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  plan_approval_id uuid,
  content_approval_id uuid,
  actor_id uuid NOT NULL,
  reason text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  CHECK (num_nonnulls(plan_approval_id, content_approval_id) = 1),
  UNIQUE (church_id, plan_approval_id),
  UNIQUE (church_id, content_approval_id),
  FOREIGN KEY (church_id, plan_approval_id) REFERENCES plan_approval(church_id, id),
  FOREIGN KEY (church_id, content_approval_id) REFERENCES content_approval(church_id, id),
  FOREIGN KEY (church_id, actor_id) REFERENCES membership(church_id, id)
);

CREATE TABLE review_decision (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  plan_revision_id uuid,
  content_revision_id uuid,
  actor_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('Approve', 'Changes Requested', 'Superseded')),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  CHECK (num_nonnulls(plan_revision_id, content_revision_id) = 1),
  FOREIGN KEY (church_id, plan_revision_id) REFERENCES plan_revision(church_id, id),
  FOREIGN KEY (church_id, content_revision_id) REFERENCES content_revision(church_id, id),
  FOREIGN KEY (church_id, actor_id) REFERENCES membership(church_id, id)
);

CREATE TABLE destination (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('web', 'email', 'sms')),
  configuration_reference text NOT NULL,
  PRIMARY KEY (church_id, id)
);

CREATE TABLE schedule (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  content_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  approval_id uuid NOT NULL,
  destination_id uuid NOT NULL,
  local_date date NOT NULL,
  local_time time NOT NULL,
  time_zone text NOT NULL,
  resolver_version text NOT NULL,
  due_at timestamptz NOT NULL,
  state schedule_state NOT NULL DEFAULT 'Pending',
  lease_token uuid,
  lease_until timestamptz,
  cancelled_reason text,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, content_id, id, revision_id, approval_id),
  FOREIGN KEY (church_id, content_id, revision_id, approval_id)
    REFERENCES content_approval(church_id, content_id, revision_id, id),
  FOREIGN KEY (church_id, destination_id) REFERENCES destination(church_id, id)
);

CREATE UNIQUE INDEX one_pending_schedule_per_destination
  ON schedule(church_id, content_id, destination_id) WHERE state = 'Pending';
CREATE INDEX due_schedule ON schedule(church_id, due_at) WHERE state = 'Pending';

CREATE TABLE publication (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  content_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  approval_id uuid NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, schedule_id),
  UNIQUE (church_id, content_id, id),
  FOREIGN KEY (church_id, content_id, schedule_id, revision_id, approval_id)
    REFERENCES schedule(church_id, content_id, id, revision_id, approval_id)
);

ALTER TABLE content ADD FOREIGN KEY (church_id, id, live_publication_id)
  REFERENCES publication(church_id, content_id, id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE engagement (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  publication_id uuid NOT NULL,
  subject_token text,
  event_kind text NOT NULL,
  event_key text NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, event_key),
  FOREIGN KEY (church_id, publication_id) REFERENCES publication(church_id, id)
);

CREATE TABLE delivery (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  publication_id uuid NOT NULL,
  recipient_token text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  state delivery_state NOT NULL DEFAULT 'Pending',
  provider text NOT NULL,
  provider_key text NOT NULL,
  provider_message_id text,
  not_before timestamptz,
  deferral_reason text,
  dispatch_authorized_at timestamptz,
  reconciliation_after timestamptz,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, publication_id, channel, recipient_token),
  UNIQUE (church_id, provider, provider_key),
  FOREIGN KEY (church_id, publication_id) REFERENCES publication(church_id, id)
);

CREATE TABLE provider_event (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  delivery_id uuid NOT NULL,
  provider text NOT NULL,
  event_key text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, provider, event_key),
  FOREIGN KEY (church_id, delivery_id) REFERENCES delivery(church_id, id)
);

CREATE TABLE idempotency_record (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  actor_id uuid NOT NULL,
  method text NOT NULL,
  route text NOT NULL,
  key text NOT NULL,
  request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
  response_status integer NOT NULL CHECK (response_status BETWEEN 200 AND 299),
  response_body jsonb NOT NULL,
  response_etag text,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, actor_id, method, route, key),
  FOREIGN KEY (church_id, actor_id) REFERENCES membership(church_id, id)
);

CREATE TABLE outbox (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  event_key text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, event_key)
);

CREATE INDEX pending_outbox ON outbox(church_id, created_at) WHERE delivered_at IS NULL;

CREATE TABLE consumer_receipt (
  church_id uuid NOT NULL,
  id uuid NOT NULL,
  outbox_id uuid NOT NULL,
  consumer text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id),
  UNIQUE (church_id, outbox_id, consumer),
  FOREIGN KEY (church_id, outbox_id) REFERENCES outbox(church_id, id)
);

CREATE TABLE audit_event (
  church_id uuid NOT NULL REFERENCES church(church_id),
  id uuid NOT NULL,
  actor_subject text NOT NULL,
  action text NOT NULL,
  subject_reference text NOT NULL,
  metadata jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, id)
);

CREATE FUNCTION reject_immutable_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'immutable record: create a revision or append a revocation';
END;
$$;

DO $$
DECLARE
  immutable_table text;
BEGIN
  FOREACH immutable_table IN ARRAY ARRAY[
    'plan_revision', 'content_revision', 'plan_approval', 'content_approval',
    'approval_revocation', 'review_decision', 'publication', 'provider_event', 'consumer_receipt', 'audit_event'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON church_design.%I FOR EACH ROW EXECUTE FUNCTION church_design.reject_immutable_change()',
      immutable_table
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOR tenant_table IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'church_design'
  LOOP
    EXECUTE format('ALTER TABLE church_design.%I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE church_design.%I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format(
      'CREATE POLICY tenant_scope ON church_design.%I USING (church_id = nullif(current_setting(''app.church_id'', true), '''')::uuid) WITH CHECK (church_id = nullif(current_setting(''app.church_id'', true), '''')::uuid)',
      tenant_table
    );
  END LOOP;
END;
$$;

REVOKE ALL ON SCHEMA church_design FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA church_design FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA church_design FROM PUBLIC;

COMMIT;
