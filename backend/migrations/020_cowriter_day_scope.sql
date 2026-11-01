ALTER TABLE cowriter_conversations ADD COLUMN selected_date date;
UPDATE cowriter_conversations c SET selected_date=s.local_date FROM aggregates a JOIN slots s ON s.church_id=a.church_id AND s.id=a.slot_id WHERE c.church_id=a.church_id AND c.aggregate_id=a.id;
ALTER TABLE cowriter_conversations ALTER COLUMN selected_date SET NOT NULL;
