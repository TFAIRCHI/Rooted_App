ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

UPDATE memberships
SET capabilities=array_append(capabilities,'engagement:read')
WHERE active AND 'plans:edit'=ANY(capabilities) AND NOT 'engagement:read'=ANY(capabilities);
