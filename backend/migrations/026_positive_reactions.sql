-- Keep existing appreciation while adding the requested positive emoji reactions.
ALTER TABLE reactions DROP CONSTRAINT reactions_type_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_type_check CHECK(type IN ('thankful','encouraged','praying','like','fire'));
