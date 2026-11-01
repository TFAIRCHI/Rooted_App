CREATE TABLE cowriter_conversations (
  church_id uuid NOT NULL, id uuid NOT NULL, actor_id text NOT NULL, aggregate_id uuid NOT NULL,
  source_id uuid, source_hash text, messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', cleared boolean NOT NULL DEFAULT false,
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,actor_id) REFERENCES memberships(church_id,user_id),
  FOREIGN KEY(church_id,aggregate_id) REFERENCES aggregates(church_id,id) ON DELETE CASCADE
);
CREATE TABLE cowriter_sources (
  church_id uuid NOT NULL, id uuid NOT NULL, conversation_id uuid NOT NULL, actor_id text NOT NULL,
  text text NOT NULL, sha256 text NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(church_id,id), FOREIGN KEY(church_id,conversation_id) REFERENCES cowriter_conversations(church_id,id) ON DELETE CASCADE
);
ALTER TABLE cowriter_conversations ADD FOREIGN KEY(church_id,source_id) REFERENCES cowriter_sources(church_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE cowriter_requests (
  church_id uuid NOT NULL, id uuid NOT NULL, conversation_id uuid NOT NULL, actor_id text NOT NULL,
  request_key text NOT NULL, request_hash text NOT NULL, kind text NOT NULL CHECK(kind IN ('chat','weekly','draft')),
  status text NOT NULL CHECK(status IN ('running','completed','failed','submission_unknown','adopted')),
  base_revision_id uuid NOT NULL, source_id uuid, source_hash text, profile_version text NOT NULL,
  result jsonb, error_message text, reservation integer NOT NULL DEFAULT 13500, charged_tokens integer,
  budget_period text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  PRIMARY KEY(church_id,id), UNIQUE(church_id,actor_id,request_key),
  FOREIGN KEY(church_id,conversation_id) REFERENCES cowriter_conversations(church_id,id) ON DELETE CASCADE,
  FOREIGN KEY(church_id,source_id) REFERENCES cowriter_sources(church_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX cowriter_one_running ON cowriter_requests(church_id) WHERE status='running';
CREATE INDEX cowriter_daily ON cowriter_requests(church_id,created_at);
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['cowriter_conversations','cowriter_sources','cowriter_requests'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY private_contributor ON %I USING (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid AND actor_id=current_setting(''app.user_id'',true)) WITH CHECK (church_id=nullif(current_setting(''app.church_id'',true),'''')::uuid AND actor_id=current_setting(''app.user_id'',true))',table_name);
  END LOOP;
END $$;
-- Only numeric allowances are shared. No church content is stored in this table.
CREATE TABLE cowriter_daily_allowance (day date PRIMARY KEY, requests integer NOT NULL CHECK(requests BETWEEN 0 AND 100), church_requests jsonb NOT NULL DEFAULT '{}');
CREATE FUNCTION reserve_cowriter_allowance() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE allowed boolean; tenant text := current_setting('app.church_id',true); expired record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE church_id=nullif(current_setting('app.church_id',true),'')::uuid AND user_id=current_setting('app.user_id',true) AND active AND 'ai:use'=ANY(capabilities)) THEN
    RAISE EXCEPTION 'Co-writer permission required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cowriter:'||tenant,0));
  FOR expired IN UPDATE public.cowriter_requests SET status='submission_unknown',error_message='Request interrupted. Usage reserved conservatively; no automatic retry.',finished_at=now() WHERE church_id=tenant::uuid AND status='running' AND created_at<now()-interval '2 minutes' RETURNING reservation,budget_period LOOP
    UPDATE public.provider_budgets SET reserved_tokens=reserved_tokens-expired.reservation,charged_tokens=charged_tokens+expired.reservation WHERE church_id=tenant::uuid AND period=expired.budget_period AND reserved_tokens>=expired.reservation;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.cowriter_requests WHERE church_id=tenant::uuid AND status='running') THEN RAISE EXCEPTION 'A co-writer request is already running for this church' USING ERRCODE='23505'; END IF;
  INSERT INTO public.cowriter_daily_allowance(day,requests,church_requests) VALUES((now() AT TIME ZONE 'UTC')::date,1,jsonb_build_object(tenant,1))
  ON CONFLICT(day) DO UPDATE SET requests=cowriter_daily_allowance.requests+1,church_requests=jsonb_set(cowriter_daily_allowance.church_requests,ARRAY[tenant],to_jsonb(coalesce((cowriter_daily_allowance.church_requests->>tenant)::integer,0)+1)) WHERE cowriter_daily_allowance.requests<100 AND coalesce((cowriter_daily_allowance.church_requests->>tenant)::integer,0)<30 RETURNING true INTO allowed;
  RETURN coalesce(allowed,false);
END $$;
REVOKE ALL ON FUNCTION reserve_cowriter_allowance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_cowriter_allowance() TO gather_runtime;
