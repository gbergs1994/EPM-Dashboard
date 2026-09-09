-- Normalize legacy user roles before enforcing the approved role set.
UPDATE users
SET role = 'Team Member'
WHERE role IS NULL
   OR role NOT IN ('Team Member', 'Executive Leader', 'Project Manager');

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('Team Member', 'Executive Leader', 'Project Manager'));