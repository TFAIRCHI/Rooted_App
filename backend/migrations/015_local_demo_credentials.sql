CREATE TABLE local_credentials (
  username text PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON local_credentials FROM PUBLIC;
GRANT SELECT, UPDATE ON local_credentials TO gather_runtime;

UPDATE memberships SET capabilities=array_remove(capabilities,'memberships:manage')
WHERE active AND 'plans:edit'=ANY(capabilities) AND NOT 'policy:manage'=ANY(capabilities);

UPDATE memberships SET capabilities=array_append(capabilities,'admin:manage')
WHERE active AND 'memberships:manage'=ANY(capabilities) AND 'policy:manage'=ANY(capabilities);
