CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE churches (
  id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, time_zone text NOT NULL,
  reading_policy text NOT NULL DEFAULT 'members' CHECK (reading_policy IN ('members','public')),
  discussions_enabled boolean NOT NULL DEFAULT false, self_approval boolean NOT NULL DEFAULT false
);
CREATE TABLE memberships (
  church_id uuid NOT NULL REFERENCES churches(id), user_id text NOT NULL, display_name text NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(church_id,user_id)
);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY, user_id text NOT NULL, display_name text NOT NULL, csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_flows (
  state_hash text PRIMARY KEY, verifier text NOT NULL, nonce text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE sermons (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, title text NOT NULL,
  preached_date date NOT NULL, speaker text NOT NULL, passages jsonb NOT NULL, notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id)
);
CREATE TABLE sources (
  church_id uuid NOT NULL, id uuid NOT NULL, sermon_id uuid NOT NULL, kind text NOT NULL,
  rights jsonb NOT NULL, provenance jsonb NOT NULL, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,sermon_id) REFERENCES sermons(church_id,id)
);
CREATE TABLE series (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, title text NOT NULL,
  week_anchor date NOT NULL, time_zone text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id)
);
CREATE TABLE series_sermons (
  church_id uuid NOT NULL, series_id uuid NOT NULL, sermon_id uuid NOT NULL,
  PRIMARY KEY(church_id,series_id,sermon_id),
  FOREIGN KEY(church_id,series_id) REFERENCES series(church_id,id),
  FOREIGN KEY(church_id,sermon_id) REFERENCES sermons(church_id,id)
);
CREATE TABLE slots (
  church_id uuid NOT NULL, id uuid NOT NULL, series_id uuid NOT NULL,
  local_date date NOT NULL, local_time text NOT NULL, time_zone text NOT NULL, assignee_ids text[] NOT NULL,
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,series_id) REFERENCES series(church_id,id)
);
CREATE TABLE aggregates (
  church_id uuid NOT NULL, id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('plan','content')),
  slot_id uuid NOT NULL, plan_id uuid, head_revision_id uuid, approval_id uuid, live_publication_id uuid,
  status text NOT NULL DEFAULT 'draft', version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  UNIQUE(church_id,id,kind), UNIQUE(church_id,id,plan_id),
  FOREIGN KEY(church_id,slot_id) REFERENCES slots(church_id,id),
  FOREIGN KEY(church_id,plan_id) REFERENCES aggregates(church_id,id),
  CHECK((kind='plan' AND plan_id IS NULL AND status IN ('draft','in_review','changes_requested','approved','cancelled'))
     OR (kind='content' AND plan_id IS NOT NULL AND status IN ('draft','in_review','changes_requested','approved','scheduled','published','cancelled')))
);
CREATE UNIQUE INDEX one_plan_per_slot ON aggregates(church_id,slot_id) WHERE kind='plan';
CREATE TABLE revisions (
  church_id uuid NOT NULL, id uuid NOT NULL, aggregate_id uuid NOT NULL, number integer NOT NULL,
  author_id text NOT NULL, payload jsonb NOT NULL, calendar jsonb NOT NULL,
  canonical_bytes text NOT NULL, hash text NOT NULL, plan_approval_id uuid, plan_hash text,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  UNIQUE(church_id,aggregate_id,id), UNIQUE(church_id,aggregate_id,number), UNIQUE(church_id,id,hash),
  FOREIGN KEY(church_id,aggregate_id) REFERENCES aggregates(church_id,id),
  CHECK(hash=encode(digest(canonical_bytes,'sha256'),'hex')),
  CHECK((canonical_bytes::jsonb->'payload')=payload),
  CHECK((canonical_bytes::jsonb->>'churchId')::uuid=church_id),
  CHECK((canonical_bytes::jsonb->>'aggregateId')::uuid=aggregate_id),
  CHECK((canonical_bytes::jsonb->>'number')::integer=number),
  CHECK(canonical_bytes::jsonb->>'authorId'=author_id),
  CHECK(canonical_bytes::jsonb->'calendar'=calendar),
  CHECK((canonical_bytes::jsonb->>'planApprovalId')::uuid IS NOT DISTINCT FROM plan_approval_id),
  CHECK((canonical_bytes::jsonb->>'planHash') IS NOT DISTINCT FROM plan_hash)
);
CREATE TABLE approvals (
  church_id uuid NOT NULL, id uuid NOT NULL, aggregate_id uuid NOT NULL, revision_id uuid NOT NULL,
  hash text NOT NULL, approver_id text NOT NULL, plan_approval_id uuid, plan_hash text,
  policy_version text NOT NULL DEFAULT 'separate-author-v1', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,aggregate_id,id), UNIQUE(church_id,id,hash),
  FOREIGN KEY(church_id,aggregate_id,revision_id) REFERENCES revisions(church_id,aggregate_id,id),
  FOREIGN KEY(church_id,revision_id,hash) REFERENCES revisions(church_id,id,hash),
  FOREIGN KEY(church_id,plan_approval_id) REFERENCES approvals(church_id,id)
);
ALTER TABLE revisions ADD FOREIGN KEY(church_id,plan_approval_id,plan_hash) REFERENCES approvals(church_id,id,hash);
ALTER TABLE aggregates ADD FOREIGN KEY(church_id,id,head_revision_id) REFERENCES revisions(church_id,aggregate_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE aggregates ADD FOREIGN KEY(church_id,id,approval_id) REFERENCES approvals(church_id,aggregate_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE reviews (
  church_id uuid NOT NULL, id uuid NOT NULL, aggregate_id uuid NOT NULL, revision_id uuid NOT NULL,
  actor_id text NOT NULL, decision text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,aggregate_id,revision_id) REFERENCES revisions(church_id,aggregate_id,id)
);
CREATE TABLE comments (
  church_id uuid NOT NULL, id uuid NOT NULL, aggregate_id uuid NOT NULL, revision_id uuid NOT NULL,
  author_id text NOT NULL, body text NOT NULL, field_path text, mention_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,aggregate_id,revision_id) REFERENCES revisions(church_id,aggregate_id,id)
);
CREATE TABLE mentions (
  church_id uuid NOT NULL, id uuid NOT NULL, comment_id uuid NOT NULL, user_id text NOT NULL,
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,comment_id) REFERENCES comments(church_id,id),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE notifications (
  church_id uuid NOT NULL, id uuid NOT NULL, user_id text NOT NULL, type text NOT NULL, resource_id uuid,
  read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE schedules (
  church_id uuid NOT NULL, id uuid NOT NULL, content_id uuid NOT NULL, revision_id uuid NOT NULL,
  approval_id uuid NOT NULL, local_date date NOT NULL, local_time text NOT NULL, time_zone text NOT NULL,
  due_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending', destination_id text NOT NULL DEFAULT 'web',
  resolver_version text NOT NULL DEFAULT 'luxon-3.7.2', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,id,content_id),
  FOREIGN KEY(church_id,content_id,revision_id) REFERENCES revisions(church_id,aggregate_id,id),
  FOREIGN KEY(church_id,content_id,approval_id) REFERENCES approvals(church_id,aggregate_id,id)
);
CREATE TABLE publications (
  church_id uuid NOT NULL, id uuid NOT NULL, content_id uuid NOT NULL, revision_id uuid NOT NULL,
  approval_id uuid NOT NULL, schedule_id uuid NOT NULL, published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,schedule_id), UNIQUE(church_id,content_id,id),
  FOREIGN KEY(church_id,content_id,revision_id) REFERENCES revisions(church_id,aggregate_id,id),
  FOREIGN KEY(church_id,content_id,approval_id) REFERENCES approvals(church_id,aggregate_id,id),
  FOREIGN KEY(church_id,schedule_id,content_id) REFERENCES schedules(church_id,id,content_id)
);
ALTER TABLE aggregates ADD FOREIGN KEY(church_id,id,live_publication_id) REFERENCES publications(church_id,content_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE outbox (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, type text NOT NULL, resource_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,type,resource_id)
);
CREATE TABLE reactions (
  church_id uuid NOT NULL, id uuid NOT NULL, publication_id uuid NOT NULL, user_id text NOT NULL,
  type text NOT NULL CHECK(type IN ('thankful','encouraged','praying')), PRIMARY KEY(church_id,id),
  UNIQUE(church_id,publication_id,user_id), FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE discussions (
  church_id uuid NOT NULL, id uuid NOT NULL, publication_id uuid NOT NULL, user_id text NOT NULL,
  body text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE reports (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL, reporter_id text NOT NULL,
  reason text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,discussion_id) REFERENCES discussions(church_id,id)
);
CREATE TABLE consent (
  church_id uuid NOT NULL, id uuid NOT NULL, user_id text NOT NULL, channel text NOT NULL, status text NOT NULL,
  evidence jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,user_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE delivery (
  church_id uuid NOT NULL, id uuid NOT NULL, publication_id uuid NOT NULL, recipient_token text NOT NULL,
  channel text NOT NULL, status text NOT NULL DEFAULT 'provider_disabled', not_before timestamptz,
  payload jsonb NOT NULL DEFAULT '{}', PRIMARY KEY(church_id,id),
  UNIQUE(church_id,publication_id,recipient_token,channel), FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id)
);
CREATE TABLE integration_states (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, provider text NOT NULL,
  status text NOT NULL DEFAULT 'disabled', payload jsonb NOT NULL DEFAULT '{}', PRIMARY KEY(church_id,id), UNIQUE(church_id,provider)
);
CREATE TABLE audit (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, actor_id text NOT NULL,
  action text NOT NULL, resource_id uuid, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id)
);
CREATE TABLE idempotency (
  church_id uuid NOT NULL REFERENCES churches(id), actor_id text NOT NULL, route text NOT NULL, key text NOT NULL,
  request_hash text NOT NULL, status integer NOT NULL, body jsonb NOT NULL, etag text,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,actor_id,route,key)
);
CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable record' USING ERRCODE='23000'; END $$;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['revisions','approvals','reviews','audit','publications','consent'] LOOP
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_immutable_change()',table_name);
  END LOOP;
END $$;
CREATE FUNCTION validate_revision_dependency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aggregate_record aggregates; approval_record approvals;
BEGIN
  SELECT * INTO aggregate_record FROM aggregates WHERE church_id=NEW.church_id AND id=NEW.aggregate_id;
  IF aggregate_record.kind='plan' AND NEW.plan_approval_id IS NOT NULL THEN RAISE EXCEPTION 'plan cannot depend on plan approval'; END IF;
  IF aggregate_record.kind='content' THEN
    SELECT * INTO approval_record FROM approvals WHERE church_id=NEW.church_id AND id=NEW.plan_approval_id;
    IF approval_record.id IS NULL OR approval_record.aggregate_id <> aggregate_record.plan_id OR approval_record.hash <> NEW.plan_hash THEN
      RAISE EXCEPTION 'content approval must reference its own plan';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER revision_dependency BEFORE INSERT ON revisions FOR EACH ROW EXECUTE FUNCTION validate_revision_dependency();
CREATE FUNCTION auth_memberships(subject text) RETURNS TABLE(id uuid,slug text,name text,time_zone text,capabilities text[])
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT churches.id,churches.slug,churches.name,churches.time_zone,memberships.capabilities
  FROM churches JOIN memberships ON memberships.church_id=churches.id WHERE memberships.user_id=subject AND memberships.active
$$;
CREATE FUNCTION worker_churches() RETURNS TABLE(id uuid) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT id FROM churches $$;
CREATE FUNCTION public_church(lookup_slug text) RETURNS TABLE(id uuid) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT id FROM churches WHERE slug=lookup_slug AND reading_policy='public'
$$;
REVOKE ALL ON FUNCTION auth_memberships(text),worker_churches(),public_church(text) FROM PUBLIC;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['memberships','sermons','sources','series','series_sermons','slots','aggregates','revisions','approvals','reviews','comments','mentions','notifications','schedules','publications','outbox','reactions','discussions','reports','consent','delivery','integration_states','audit','idempotency'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (church_id = nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK (church_id = nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
END $$;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches FORCE ROW LEVEL SECURITY;
CREATE POLICY church_isolation ON churches USING (id=nullif(current_setting('app.church_id',true),'')::uuid) WITH CHECK (id=nullif(current_setting('app.church_id',true),'')::uuid);
