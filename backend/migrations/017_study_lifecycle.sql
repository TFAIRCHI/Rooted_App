ALTER TABLE slots
  ADD COLUMN lifecycle_version integer NOT NULL DEFAULT 1 CHECK(lifecycle_version>0),
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by text,
  ADD COLUMN deletion_reason text,
  ADD COLUMN withdrawn_at timestamptz,
  ADD COLUMN withdrawn_by text,
  ADD FOREIGN KEY(church_id,deleted_by) REFERENCES memberships(church_id,user_id),
  ADD FOREIGN KEY(church_id,withdrawn_by) REFERENCES memberships(church_id,user_id),
  ADD CHECK((deleted_at IS NULL)=(deleted_by IS NULL)),
  ADD CHECK((withdrawn_at IS NULL)=(withdrawn_by IS NULL)),
  ADD CHECK(deleted_at IS NULL OR withdrawn_at IS NULL),
  ADD CHECK(deletion_reason IS NULL OR length(deletion_reason)<=1000);

DO $$
DECLARE duplicates text;
BEGIN
  SELECT string_agg(format('church=%s date=%s slots=%s',church_id,local_date,ids),'; ')
    INTO duplicates FROM (
      SELECT church_id,local_date,string_agg(id::text,',' ORDER BY id) AS ids
      FROM slots WHERE deleted_at IS NULL AND withdrawn_at IS NULL
      GROUP BY church_id,local_date HAVING count(*)>1
    ) conflicts;
  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Active study date duplicates require explicit repair before migration: %',duplicates;
  END IF;
END $$;
CREATE UNIQUE INDEX one_active_study_per_church_date ON slots(church_id,local_date)
  WHERE deleted_at IS NULL AND withdrawn_at IS NULL;
DROP INDEX one_study_per_series_date;

UPDATE memberships SET capabilities=array_append(capabilities,'studies:delete')
WHERE NOT ('studies:delete'=ANY(capabilities))
  AND ('content:edit'=ANY(capabilities) OR 'admin:manage'=ANY(capabilities));
UPDATE memberships SET capabilities=array_append(capabilities,'engagement:read')
WHERE 'admin:manage'=ANY(capabilities) AND NOT ('engagement:read'=ANY(capabilities));

CREATE TABLE study_purge_audit (
  church_id uuid NOT NULL REFERENCES churches(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL,
  actor_id text NOT NULL,
  reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
  purged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id),
  UNIQUE(church_id,study_id)
);
ALTER TABLE study_purge_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_purge_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON study_purge_audit
  USING(church_id=nullif(current_setting('app.church_id',true),'')::uuid)
  WITH CHECK(church_id=nullif(current_setting('app.church_id',true),'')::uuid);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON study_purge_audit FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();

DO $$
DECLARE dependency record;
BEGIN
  FOR dependency IN SELECT conrelid::regclass AS relation,conname FROM pg_constraint
    WHERE contype='f' AND confrelid IN ('aggregates'::regclass,'revisions'::regclass,'approvals'::regclass,'publications'::regclass,'schedules'::regclass)
      AND connamespace='public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',dependency.relation,dependency.conname);
  END LOOP;
END $$;

CREATE FUNCTION purge_withdrawn_study(target_church uuid,target_study uuid,confirmation text,purge_reason text,expected_version integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  root slots;
  root_ids uuid[];
  publication_ids uuid[];
  resource_ids uuid[];
  job_ids uuid[];
  actor text;
  audit_id uuid;
BEGIN
  actor:=nullif(current_setting('app.user_id',true),'');
  IF target_church IS DISTINCT FROM nullif(current_setting('app.church_id',true),'')::uuid
    OR NOT EXISTS(SELECT 1 FROM public.memberships WHERE church_id=target_church AND user_id=actor AND active AND 'admin:manage'=ANY(capabilities)) THEN
    RAISE EXCEPTION 'Active tenant administrator required' USING ERRCODE='42501';
  END IF;
  IF confirmation IS DISTINCT FROM 'PERMANENTLY DELETE '||target_study::text
    OR purge_reason IS NULL OR length(trim(purge_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Explicit irreversible confirmation and reason required' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.aggregates WHERE church_id=target_church AND slot_id=target_study AND kind='plan' FOR UPDATE;
  PERFORM 1 FROM public.aggregates WHERE church_id=target_church AND slot_id=target_study AND kind='content' ORDER BY id FOR UPDATE;
  SELECT * INTO root FROM public.slots WHERE church_id=target_church AND id=target_study FOR UPDATE;
  IF root.id IS NULL OR root.withdrawn_at IS NULL THEN
    RAISE EXCEPTION 'Only a withdrawn retained study can be purged' USING ERRCODE='22023';
  END IF;
  IF root.lifecycle_version IS DISTINCT FROM expected_version THEN
    RAISE EXCEPTION 'Study version changed' USING ERRCODE='40001';
  END IF;
  IF EXISTS(SELECT 1 FROM public.provider_jobs WHERE church_id=target_church AND kind='ai' AND payload->>'aggregateId' IN
    (SELECT id::text FROM public.aggregates WHERE church_id=target_church AND slot_id=target_study) AND status='running')
    OR EXISTS(SELECT 1 FROM public.provider_send_intents WHERE church_id=target_church AND publication_id IN
      (SELECT id FROM public.publications WHERE church_id=target_church AND content_id IN
        (SELECT id FROM public.aggregates WHERE church_id=target_church AND slot_id=target_study)) AND status IN ('submitting','submission_unknown')) THEN
    RAISE EXCEPTION 'Reconcile in-flight provider work before purge' USING ERRCODE='55000';
  END IF;
  SELECT coalesce(array_agg(id),'{}') INTO root_ids FROM public.aggregates WHERE church_id=target_church AND slot_id=target_study;
  SELECT coalesce(array_agg(id),'{}') INTO publication_ids FROM public.publications WHERE church_id=target_church AND content_id=ANY(root_ids);
  SELECT coalesce(array_agg(id),'{}') INTO job_ids FROM public.provider_jobs WHERE church_id=target_church AND kind='ai' AND payload->>'aggregateId'=ANY(root_ids::text[]);
  SELECT array_agg(resource_id) INTO resource_ids FROM (
    SELECT target_study AS resource_id UNION SELECT unnest(root_ids) UNION SELECT unnest(publication_ids) UNION SELECT unnest(job_ids)
    UNION SELECT id FROM public.revisions WHERE church_id=target_church AND aggregate_id=ANY(root_ids)
    UNION SELECT id FROM public.approvals WHERE church_id=target_church AND aggregate_id=ANY(root_ids)
    UNION SELECT id FROM public.schedules WHERE church_id=target_church AND content_id=ANY(root_ids)
    UNION SELECT id FROM public.discussions WHERE church_id=target_church AND publication_id=ANY(publication_ids)
    UNION SELECT id FROM public.comments WHERE church_id=target_church AND aggregate_id=ANY(root_ids)
    UNION SELECT id FROM public.provider_proposals WHERE church_id=target_church AND aggregate_id=ANY(root_ids)
    UNION SELECT id FROM public.provider_send_intents WHERE church_id=target_church AND publication_id=ANY(publication_ids)
    UNION SELECT id FROM public.delivery WHERE church_id=target_church AND publication_id=ANY(publication_ids)
    UNION SELECT id FROM public.reviews WHERE church_id=target_church AND aggregate_id=ANY(root_ids)
    UNION SELECT id FROM public.study_review_requests WHERE church_id=target_church AND content_id=ANY(root_ids)
  ) resources;
  SET CONSTRAINTS ALL DEFERRED;
  PERFORM set_config('app.purge_study',target_study::text,true);
  DELETE FROM public.provider_webhook_inbox WHERE church_id=target_church AND payload->>'messageSid' IN (SELECT provider_sid FROM public.provider_send_intents WHERE church_id=target_church AND publication_id=ANY(publication_ids) AND provider_sid IS NOT NULL);
  DELETE FROM public.provider_send_intents WHERE church_id=target_church AND publication_id=ANY(publication_ids);
  DELETE FROM public.delivery WHERE church_id=target_church AND publication_id=ANY(publication_ids);
  DELETE FROM public.reports WHERE church_id=target_church AND discussion_id IN (SELECT id FROM public.discussions WHERE church_id=target_church AND publication_id=ANY(publication_ids));
  DELETE FROM public.moderation_actions WHERE church_id=target_church AND discussion_id IN (SELECT id FROM public.discussions WHERE church_id=target_church AND publication_id=ANY(publication_ids));
  DELETE FROM public.discussion_revisions WHERE church_id=target_church AND discussion_id IN (SELECT id FROM public.discussions WHERE church_id=target_church AND publication_id=ANY(publication_ids));
  DELETE FROM public.discussions WHERE church_id=target_church AND publication_id=ANY(publication_ids);
  DELETE FROM public.reactions WHERE church_id=target_church AND publication_id=ANY(publication_ids);
  DELETE FROM public.mentions WHERE church_id=target_church AND comment_id IN (SELECT id FROM public.comments WHERE church_id=target_church AND aggregate_id=ANY(root_ids));
  DELETE FROM public.comments WHERE church_id=target_church AND aggregate_id=ANY(root_ids);
  DELETE FROM public.provider_adoptions WHERE church_id=target_church AND (proposal_id IN (SELECT id FROM public.provider_proposals WHERE church_id=target_church AND aggregate_id=ANY(root_ids)) OR revision_id IN (SELECT id FROM public.revisions WHERE church_id=target_church AND aggregate_id=ANY(root_ids)));
  DELETE FROM public.provider_proposals WHERE church_id=target_church AND aggregate_id=ANY(root_ids);
  DELETE FROM public.provider_jobs WHERE church_id=target_church AND id=ANY(job_ids);
  DELETE FROM public.study_review_requests WHERE church_id=target_church AND content_id=ANY(root_ids);
  DELETE FROM public.reviews WHERE church_id=target_church AND aggregate_id=ANY(root_ids);
  DELETE FROM public.publications WHERE church_id=target_church AND id=ANY(publication_ids);
  DELETE FROM public.schedules WHERE church_id=target_church AND content_id=ANY(root_ids);
  DELETE FROM public.approvals WHERE church_id=target_church AND aggregate_id=ANY(root_ids);
  DELETE FROM public.revisions WHERE church_id=target_church AND aggregate_id=ANY(root_ids);
  DELETE FROM public.aggregates WHERE church_id=target_church AND id=ANY(root_ids);
  DELETE FROM public.slots WHERE church_id=target_church AND id=target_study;
  DELETE FROM public.notifications WHERE church_id=target_church AND resource_id=ANY(resource_ids);
  DELETE FROM public.outbox WHERE church_id=target_church AND (resource_id=ANY(resource_ids) OR payload->>'contentId'=ANY(root_ids::text[]));
  DELETE FROM public.audit WHERE church_id=target_church AND resource_id=ANY(resource_ids);
  DELETE FROM public.idempotency WHERE church_id=target_church AND EXISTS(SELECT 1 FROM unnest(resource_ids) resource_id WHERE strpos(route,resource_id::text)>0 OR strpos(body::text,resource_id::text)>0);
  PERFORM set_config('app.purge_study','',true);
  INSERT INTO public.study_purge_audit(church_id,study_id,actor_id,reason) VALUES(target_church,target_study,actor,trim(purge_reason)) RETURNING id INTO audit_id;
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN audit_id;
END $$;
REVOKE ALL ON FUNCTION purge_withdrawn_study(uuid,uuid,text,text,integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' AND TG_TABLE_NAME<>'study_purge_audit'
    AND nullif(current_setting('app.purge_study',true),'') IS NOT NULL
    AND current_user=pg_catalog.pg_get_userbyid((SELECT proowner FROM pg_catalog.pg_proc WHERE oid='public.purge_withdrawn_study(uuid,uuid,text,text,integer)'::regprocedure)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'immutable record' USING ERRCODE='23000';
END $$;
