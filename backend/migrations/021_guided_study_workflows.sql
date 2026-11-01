CREATE TABLE study_workflows (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, actor_id text NOT NULL,
  series_id uuid NOT NULL, assignee_id text NOT NULL, time_zone text NOT NULL, local_time text NOT NULL,
  state text NOT NULL DEFAULT 'plan_queued' CHECK(state IN ('plan_queued','planning','direction_review','awaiting_generation_confirmation','queued','generating','paused_conflict','failed','canceled','drafts_saved','erased')),
  version integer NOT NULL DEFAULT 1, source_id uuid, source_hash text NOT NULL,
  profile text NOT NULL, profile_hash text NOT NULL, reference_sunday date NOT NULL,
  plan jsonb, messages jsonb NOT NULL DEFAULT '[]', confirmation jsonb, mapping jsonb NOT NULL DEFAULT '[]',
  tokens_used integer NOT NULL DEFAULT 0 CHECK(tokens_used>=0), tokens_reserved integer NOT NULL DEFAULT 0 CHECK(tokens_reserved>=0),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 12), error text,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,assignee_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,series_id) REFERENCES series(church_id,id)
);
CREATE TABLE study_workflow_sources (
  church_id uuid NOT NULL,id uuid NOT NULL,run_id uuid NOT NULL,actor_id text NOT NULL,
  text text NOT NULL,sha256 text NOT NULL,allowed_references jsonb NOT NULL,library_source_id uuid,library_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,run_id) REFERENCES study_workflows(church_id,id)
);
ALTER TABLE study_workflows ADD FOREIGN KEY(church_id,source_id) REFERENCES study_workflow_sources(church_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE study_workflow_plans (
  church_id uuid NOT NULL,id uuid NOT NULL,run_id uuid NOT NULL,actor_id text NOT NULL,version integer NOT NULL,
  payload jsonb NOT NULL,sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id),UNIQUE(church_id,run_id,version),FOREIGN KEY(church_id,run_id) REFERENCES study_workflows(church_id,id)
);
CREATE TABLE study_workflow_jobs (
  church_id uuid NOT NULL,id uuid NOT NULL,run_id uuid NOT NULL,actor_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('plan','day')),local_date date,run_version integer NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','running','completed','failed','submission_unknown','canceled')),
  prepared jsonb NOT NULL,reservation integer NOT NULL,charged integer,period text NOT NULL,
  result jsonb,usage jsonb,provider_response_id text,error text,lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
  PRIMARY KEY(church_id,id),FOREIGN KEY(church_id,run_id) REFERENCES study_workflows(church_id,id)
);
CREATE INDEX workflow_job_queue ON study_workflow_jobs(church_id,state,created_at);
CREATE UNIQUE INDEX workflow_one_running ON study_workflow_jobs(church_id) WHERE state='running';
CREATE TABLE study_workflow_commands (
  church_id uuid NOT NULL,id uuid NOT NULL,actor_id text NOT NULL,command text NOT NULL,key text NOT NULL,
  request_hash text NOT NULL,run_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id),UNIQUE(church_id,actor_id,command,key),FOREIGN KEY(church_id,run_id) REFERENCES study_workflows(church_id,id)
);
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['study_workflows','study_workflow_sources','study_workflow_plans','study_workflow_jobs','study_workflow_commands'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY private_workflow ON %I USING (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid AND actor_id=current_setting(''app.user_id'',true)) WITH CHECK (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid AND actor_id=current_setting(''app.user_id'',true))',table_name);
  END LOOP;
END $$;

-- Worker discovery returns identities only; private content remains behind owner RLS.
CREATE FUNCTION study_workflow_actors() RETURNS TABLE(church_id uuid,actor_id text) LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT DISTINCT r.church_id,r.actor_id FROM public.study_workflows r WHERE r.state IN ('plan_queued','planning','queued','generating') OR EXISTS(SELECT 1 FROM public.study_workflow_jobs j WHERE j.church_id=r.church_id AND j.run_id=r.id AND j.state='running')
$$;
REVOKE ALL ON FUNCTION study_workflow_actors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION study_workflow_actors() TO gather_runtime;

-- A common gate serializes both the original assistant and workflow calls.
CREATE OR REPLACE FUNCTION reserve_cowriter_allowance() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE allowed boolean; tenant text := current_setting('app.church_id',true); expired record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE church_id=nullif(tenant,'')::uuid AND user_id=current_setting('app.user_id',true) AND active AND 'ai:use'=ANY(capabilities)) THEN
    RAISE EXCEPTION 'Co-writer permission required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cowriter:'||tenant,0));
  FOR expired IN UPDATE public.cowriter_requests SET status='submission_unknown',error_message='Request interrupted. No automatic retry.',finished_at=now() WHERE church_id=tenant::uuid AND status='running' AND created_at<now()-interval '2 minutes' RETURNING reservation,budget_period LOOP
    UPDATE public.provider_budgets SET reserved_tokens=reserved_tokens-expired.reservation,charged_tokens=charged_tokens+expired.reservation WHERE church_id=tenant::uuid AND period=expired.budget_period AND reserved_tokens>=expired.reservation;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.cowriter_requests WHERE church_id=tenant::uuid AND status='running') OR EXISTS(SELECT 1 FROM public.study_workflow_jobs WHERE church_id=tenant::uuid AND state='running') THEN
    RAISE EXCEPTION 'A co-writer request is already running for this church' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.cowriter_daily_allowance(day,requests,church_requests) VALUES((now() AT TIME ZONE 'UTC')::date,1,jsonb_build_object(tenant,1))
  ON CONFLICT(day) DO UPDATE SET requests=cowriter_daily_allowance.requests+1,church_requests=jsonb_set(cowriter_daily_allowance.church_requests,ARRAY[tenant],to_jsonb(coalesce((cowriter_daily_allowance.church_requests->>tenant)::integer,0)+1)) WHERE cowriter_daily_allowance.requests<100 AND coalesce((cowriter_daily_allowance.church_requests->>tenant)::integer,0)<30 RETURNING true INTO allowed;
  RETURN coalesce(allowed,false);
END $$;

CREATE FUNCTION study_workflow_private_data(target_church uuid,target_user text,erase boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; job record;
BEGIN
  IF target_church IS DISTINCT FROM nullif(current_setting('app.church_id',true),'')::uuid OR NOT EXISTS(SELECT 1 FROM public.memberships WHERE church_id=target_church AND user_id=current_setting('app.user_id',true) AND active AND (user_id=target_user OR 'privacy:manage'=ANY(capabilities))) THEN
    RAISE EXCEPTION 'Private workflow access denied' USING ERRCODE='42501';
  END IF;
  IF NOT erase THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'state',r.state,'plan',r.plan,'messages',r.messages,'mapping',r.mapping,'sourceText',(SELECT s.text FROM public.study_workflow_sources s WHERE s.church_id=r.church_id AND s.id=r.source_id),'createdAt',r.created_at)), '[]') INTO result FROM public.study_workflows r WHERE r.church_id=target_church AND r.actor_id=target_user;
    RETURN result;
  END IF;
  PERFORM 1 FROM public.study_workflows WHERE church_id=target_church AND actor_id=target_user ORDER BY id FOR UPDATE;
  FOR job IN UPDATE public.study_workflow_jobs SET state='canceled',prepared='{}',result=NULL,finished_at=now() WHERE church_id=target_church AND actor_id=target_user AND state='pending' RETURNING run_id,reservation,period LOOP
    UPDATE public.provider_budgets SET reserved_tokens=reserved_tokens-job.reservation WHERE church_id=target_church AND period=job.period AND reserved_tokens>=job.reservation;
    UPDATE public.study_workflows SET tokens_reserved=tokens_reserved-job.reservation WHERE church_id=target_church AND id=job.run_id;
  END LOOP;
  UPDATE public.study_workflows SET state='erased',plan=NULL,messages='[]',confirmation=NULL,mapping='[]',profile='',error=NULL WHERE church_id=target_church AND actor_id=target_user;
  UPDATE public.study_workflow_sources SET text='',allowed_references='[]' WHERE church_id=target_church AND actor_id=target_user;
  UPDATE public.study_workflow_plans SET payload='{}' WHERE church_id=target_church AND actor_id=target_user;
  UPDATE public.study_workflow_jobs SET prepared='{}',result=NULL,error=NULL WHERE church_id=target_church AND actor_id=target_user;
  RETURN jsonb_build_object('erased',true,'retained','Numeric usage, hashes, adopted study revisions and disclosed audit/backup copies');
END $$;
REVOKE ALL ON FUNCTION study_workflow_private_data(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION study_workflow_private_data(uuid,text,boolean) TO gather_runtime;

CREATE FUNCTION study_workflow_erase_run(target_church uuid,target_run uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id text; job record;
BEGIN
  IF target_church IS DISTINCT FROM nullif(current_setting('app.church_id',true),'')::uuid THEN RAISE EXCEPTION 'Workflow scope denied' USING ERRCODE='42501'; END IF;
  SELECT actor_id INTO owner_id FROM public.study_workflows WHERE church_id=target_church AND id=target_run FOR UPDATE;
  IF owner_id IS NULL OR owner_id IS DISTINCT FROM current_setting('app.user_id',true) OR NOT EXISTS(SELECT 1 FROM public.memberships WHERE church_id=target_church AND user_id=owner_id AND active) THEN RAISE EXCEPTION 'Private workflow denied' USING ERRCODE='42501'; END IF;
  FOR job IN UPDATE public.study_workflow_jobs SET state='canceled',prepared='{}',result=NULL,finished_at=now() WHERE church_id=target_church AND run_id=target_run AND state='pending' RETURNING reservation,period LOOP
    UPDATE public.provider_budgets SET reserved_tokens=reserved_tokens-job.reservation WHERE church_id=target_church AND period=job.period AND reserved_tokens>=job.reservation;
    UPDATE public.study_workflows SET tokens_reserved=tokens_reserved-job.reservation WHERE church_id=target_church AND id=target_run;
  END LOOP;
  UPDATE public.study_workflows SET state='erased',plan=NULL,messages='[]',confirmation=NULL,mapping='[]',profile='',error=NULL WHERE church_id=target_church AND id=target_run;
  UPDATE public.study_workflow_sources SET text='',allowed_references='[]' WHERE church_id=target_church AND run_id=target_run;
  UPDATE public.study_workflow_plans SET payload='{}' WHERE church_id=target_church AND run_id=target_run;
  UPDATE public.study_workflow_jobs SET prepared='{}',result=NULL,error=NULL WHERE church_id=target_church AND run_id=target_run;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION study_workflow_erase_run(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION study_workflow_erase_run(uuid,uuid) TO gather_runtime;

CREATE FUNCTION cleanup_study_workflows() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE run record; job record; count_erased integer := 0;
BEGIN
  FOR run IN SELECT church_id,id FROM public.study_workflows WHERE expires_at<=now() AND state<>'erased' ORDER BY church_id,id FOR UPDATE SKIP LOCKED LOOP
    FOR job IN UPDATE public.study_workflow_jobs SET state=CASE WHEN state='running' THEN 'submission_unknown' ELSE 'canceled' END,prepared='{}',result=NULL,charged=CASE WHEN state='running' THEN reservation ELSE 0 END,finished_at=now() WHERE church_id=run.church_id AND run_id=run.id AND state IN ('pending','running') RETURNING reservation,period,charged LOOP
      UPDATE public.provider_budgets SET reserved_tokens=reserved_tokens-job.reservation,charged_tokens=charged_tokens+job.charged WHERE church_id=run.church_id AND period=job.period AND reserved_tokens>=job.reservation;
      UPDATE public.study_workflows SET tokens_reserved=tokens_reserved-job.reservation,tokens_used=tokens_used+job.charged WHERE church_id=run.church_id AND id=run.id;
    END LOOP;
    UPDATE public.study_workflows SET state='erased',plan=NULL,messages='[]',confirmation=NULL,mapping='[]',profile='',error=NULL WHERE church_id=run.church_id AND id=run.id;
    UPDATE public.study_workflow_sources SET text='',allowed_references='[]' WHERE church_id=run.church_id AND run_id=run.id;
    UPDATE public.study_workflow_plans SET payload='{}' WHERE church_id=run.church_id AND run_id=run.id;
    UPDATE public.study_workflow_jobs SET prepared='{}',result=NULL,error=NULL WHERE church_id=run.church_id AND run_id=run.id;
    count_erased := count_erased+1;
  END LOOP;
  RETURN count_erased;
END $$;
REVOKE ALL ON FUNCTION cleanup_study_workflows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_study_workflows() TO gather_runtime;
