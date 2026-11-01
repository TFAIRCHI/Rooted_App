-- A private conversation can begin before a contributor chooses a study series.
-- Ordinary slots and studies still require their existing canonical relationships.
ALTER TABLE study_workflows ALTER COLUMN series_id DROP NOT NULL;
