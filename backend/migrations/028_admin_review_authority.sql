-- Administrators review/publish contributor-authored studies without requiring an authoring role.
-- Existing no-self-approval and immutable revision checks remain enforced by editorial commands.
-- The privileged table owner may not have BYPASSRLS (e.g. Azure PostgreSQL).
-- Temporarily permit owner access inside the migration transaction; runtime is not the owner.
ALTER TABLE memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE audit NO FORCE ROW LEVEL SECURITY;
DO $$
DECLARE target record; granted text[];
BEGIN
  FOR target IN
    SELECT church_id,user_id,capabilities FROM memberships
    WHERE 'admin:manage'=ANY(capabilities)
      AND NOT capabilities @> ARRAY['plans:approve','content:approve','publication:schedule','comments:write']::text[]
  LOOP
    PERFORM set_config('app.church_id',target.church_id::text,true);
    SELECT ARRAY(SELECT DISTINCT permission FROM unnest(target.capabilities || ARRAY['plans:approve','content:approve','publication:schedule','comments:write']::text[]) AS permission ORDER BY permission) INTO granted;
    UPDATE memberships SET capabilities=granted WHERE church_id=target.church_id AND user_id=target.user_id;
    INSERT INTO audit(church_id,id,actor_id,action,resource_id,metadata)
    VALUES(target.church_id,gen_random_uuid(),'migration:028_admin_review_authority','membership.admin_review_enabled',target.church_id,
      jsonb_build_object('targetSubject',target.user_id,'previousCapabilities',target.capabilities,'capabilities',granted,'reason','Admin reviews and publishes contributor-authored studies'));
  END LOOP;
END $$;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE audit FORCE ROW LEVEL SECURITY;
