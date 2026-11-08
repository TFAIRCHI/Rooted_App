ALTER TABLE churches ADD COLUMN public_read_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE churches ADD COLUMN public_engagement_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE churches ADD COLUMN study_sms_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE churches ADD COLUMN public_reviewed_by text;
ALTER TABLE churches ADD COLUMN public_reviewed_at timestamptz;
ALTER TABLE churches ADD COLUMN public_review_evidence text;
ALTER TABLE churches ADD COLUMN sms_activated_by text;
ALTER TABLE churches ADD COLUMN sms_activated_at timestamptz;
ALTER TABLE churches ADD COLUMN sms_activation_evidence text;
ALTER TABLE churches ADD CONSTRAINT public_engagement_requires_read CHECK (NOT public_engagement_enabled OR (public_read_enabled AND reading_policy='public'));
ALTER TABLE churches ADD CONSTRAINT study_sms_requires_read CHECK (NOT study_sms_enabled OR (public_read_enabled AND reading_policy='public'));

ALTER TABLE schedules ADD COLUMN reserved_publication_id uuid;
UPDATE schedules s SET reserved_publication_id=p.id FROM publications p WHERE p.church_id=s.church_id AND p.schedule_id=s.id;
UPDATE schedules SET reserved_publication_id=gen_random_uuid() WHERE reserved_publication_id IS NULL;
ALTER TABLE schedules ALTER COLUMN reserved_publication_id SET NOT NULL;
ALTER TABLE schedules ALTER COLUMN reserved_publication_id SET DEFAULT gen_random_uuid();
ALTER TABLE schedules ADD CONSTRAINT schedules_reserved_publication_unique UNIQUE(church_id,reserved_publication_id);

ALTER TABLE provider_contacts ADD COLUMN provenance text NOT NULL DEFAULT 'legacy_member';
ALTER TABLE provider_contacts ADD COLUMN consent_audited boolean NOT NULL DEFAULT false;
ALTER TABLE provider_contacts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE provider_contacts DROP CONSTRAINT provider_contacts_church_id_user_id_fkey;

CREATE TABLE public_reactions (
  church_id uuid NOT NULL, id uuid NOT NULL, publication_id uuid NOT NULL,
  visitor_digest text NOT NULL, type text NOT NULL CHECK(type IN ('thankful','encouraged','praying','like','fire')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,publication_id,visitor_digest),
  FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id) ON DELETE CASCADE
);
CREATE TABLE public_discussions (
  church_id uuid NOT NULL, id uuid NOT NULL, publication_id uuid NOT NULL,
  display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 120), body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),
  kind text NOT NULL DEFAULT 'response' CHECK(kind IN ('response','question','reply')),
  author_kind text NOT NULL DEFAULT 'visitor' CHECK(author_kind IN ('visitor','staff')),
  staff_user_id text, visitor_digest text, parent_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden','declined')),
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), UNIQUE(church_id,publication_id,id),
  FOREIGN KEY(church_id,publication_id) REFERENCES publications(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,staff_user_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,publication_id,parent_id) REFERENCES public_discussions(church_id,publication_id,id) ON DELETE CASCADE,
  CHECK ((author_kind='staff')=(staff_user_id IS NOT NULL)), CHECK ((author_kind='visitor')=(visitor_digest IS NOT NULL)), CHECK ((kind='reply')=(parent_id IS NOT NULL))
);
CREATE INDEX public_discussions_public ON public_discussions(church_id,publication_id,status,created_at,id);
CREATE TABLE public_discussion_reports (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,discussion_id) REFERENCES public_discussions(church_id,id) ON DELETE CASCADE
);
CREATE TABLE public_moderation_actions (
  church_id uuid NOT NULL, id uuid NOT NULL, discussion_id uuid NOT NULL,
  actor_id text NOT NULL, action text NOT NULL CHECK(action IN ('approve','hide','decline','reply')),
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,discussion_id) REFERENCES public_discussions(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE public_activity_limits (
  church_id uuid NOT NULL, id uuid NOT NULL, visitor_digest text NOT NULL, network_digest text NOT NULL,
  action text NOT NULL CHECK(action IN ('reaction','comment','report')), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id)
);
CREATE INDEX public_activity_window ON public_activity_limits(church_id,action,visitor_digest,created_at);
CREATE INDEX public_activity_network_window ON public_activity_limits(church_id,action,network_digest,created_at);
CREATE INDEX public_activity_retention ON public_activity_limits(church_id,created_at);

ALTER TABLE schedules ADD COLUMN sms_delivery_note text;
ALTER TABLE schedules ADD COLUMN sms_note_creator_id text;
ALTER TABLE schedules ADD COLUMN sms_note_revision_id uuid;
ALTER TABLE schedules ADD COLUMN sms_note_updated_at timestamptz;
CREATE TABLE sms_delivery_snapshots (
  church_id uuid NOT NULL, id uuid NOT NULL, schedule_id uuid NOT NULL, version integer NOT NULL,
  publication_id uuid NOT NULL, revision_id uuid NOT NULL, approval_id uuid NOT NULL,
  sender_scope text NOT NULL, sender_name text NOT NULL, delivery_note text NOT NULL, body text NOT NULL, body_hash text NOT NULL,
  segment_count integer NOT NULL CHECK(segment_count>0), creator_id text NOT NULL, reviewer_id text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
  PRIMARY KEY(church_id,id), UNIQUE(church_id,schedule_id,version),
  FOREIGN KEY(church_id,schedule_id) REFERENCES schedules(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,creator_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,reviewer_id) REFERENCES memberships(church_id,user_id)
);
CREATE UNIQUE INDEX sms_delivery_current ON sms_delivery_snapshots(church_id,schedule_id) WHERE superseded_at IS NULL;
ALTER TABLE provider_send_intents ADD COLUMN sms_snapshot_id uuid;
ALTER TABLE provider_send_intents ADD FOREIGN KEY(church_id,sms_snapshot_id) REFERENCES sms_delivery_snapshots(church_id,id);

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['public_reactions','public_discussions','public_discussion_reports','public_moderation_actions','public_activity_limits','sms_delivery_snapshots'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid) WITH CHECK(church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid)',table_name);
  END LOOP;
END $$;
