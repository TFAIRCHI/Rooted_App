ALTER TABLE study_workflows ADD COLUMN conversation_source boolean NOT NULL DEFAULT false;
ALTER TABLE study_workflows ADD COLUMN source_reviewed boolean NOT NULL DEFAULT true;
