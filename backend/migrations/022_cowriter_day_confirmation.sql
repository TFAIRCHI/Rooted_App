-- Preserve previously confirmed batch runs; all newly created runs use day-by-day consent.
ALTER TABLE study_workflows ADD COLUMN sequential boolean NOT NULL DEFAULT false;
ALTER TABLE study_workflows ADD COLUMN intent_confirmed boolean NOT NULL DEFAULT false;

-- Unconfirmed requests also enter the new consent flow when reopened.
UPDATE study_workflows SET sequential=true,
  state=CASE WHEN state='awaiting_generation_confirmation' THEN 'direction_review' ELSE state END
WHERE confirmation IS NULL AND mapping='[]'::jsonb AND state NOT IN ('drafts_saved','erased');
