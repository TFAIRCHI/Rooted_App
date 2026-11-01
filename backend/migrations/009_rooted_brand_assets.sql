CREATE TABLE theme_assets (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, original_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), width integer NOT NULL CHECK (width > 0 AND width <= 10000),
  height integer NOT NULL CHECK (height > 0 AND height <= 10000), mark_bytes bytea NOT NULL,
  lockup_bytes bytea NOT NULL, preview_bytes bytea NOT NULL, palette_candidates jsonb NOT NULL DEFAULT '[]', created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), replaced_at timestamptz,
  PRIMARY KEY(church_id,id), UNIQUE(church_id,sha256),
  FOREIGN KEY(church_id,created_by) REFERENCES memberships(church_id,user_id)
);
CREATE TABLE theme_revisions (
  church_id uuid NOT NULL REFERENCES churches(id), id uuid NOT NULL, asset_id uuid,
  mode text NOT NULL CHECK (mode IN ('light','dark','system')), tokens jsonb NOT NULL,
  palette_candidates jsonb NOT NULL DEFAULT '[]', source_digest text, created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(church_id,id),
  FOREIGN KEY(church_id,asset_id) REFERENCES theme_assets(church_id,id),
  FOREIGN KEY(church_id,created_by) REFERENCES memberships(church_id,user_id)
);
ALTER TABLE churches ADD COLUMN active_theme_revision_id uuid;
ALTER TABLE churches ADD CONSTRAINT churches_active_theme_revision_fk FOREIGN KEY(id,active_theme_revision_id) REFERENCES theme_revisions(church_id,id);
ALTER TABLE theme_revisions ADD CONSTRAINT theme_tokens_object CHECK (jsonb_typeof(tokens)='object');
ALTER TABLE theme_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE theme_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY theme_assets_tenant ON theme_assets USING (church_id=current_setting('app.church_id',true)::uuid) WITH CHECK (church_id=current_setting('app.church_id',true)::uuid);
CREATE POLICY theme_revisions_tenant ON theme_revisions USING (church_id=current_setting('app.church_id',true)::uuid) WITH CHECK (church_id=current_setting('app.church_id',true)::uuid);
