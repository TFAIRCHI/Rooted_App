ALTER TABLE schedules ADD COLUMN IF NOT EXISTS publication_mode text NOT NULL DEFAULT 'timed' CHECK (publication_mode IN ('timed','manual_once'));
