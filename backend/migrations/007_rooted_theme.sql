ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{"mode":"light","primary":"#177569","accent":"#ae813e","surface":"#f6f4ee"}'::jsonb;
