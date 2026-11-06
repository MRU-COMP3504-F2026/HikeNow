ALTER TABLE conversation ALTER COLUMN hiker_low DROP NOT NULL;
ALTER TABLE conversation ALTER COLUMN hiker_high DROP NOT NULL;
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'direct';
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS group_name varchar(100);
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES hiker(id) ON DELETE SET NULL;

ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_ordered_pair;
ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_details_check;
ALTER TABLE conversation ADD CONSTRAINT conversation_details_check CHECK (
  (kind = 'direct' AND hiker_low IS NOT NULL AND hiker_high IS NOT NULL
    AND hiker_low < hiker_high AND group_name IS NULL AND created_by IS NULL)
  OR
  (kind = 'group' AND hiker_low IS NULL AND hiker_high IS NULL
    AND group_name IS NOT NULL AND length(btrim(group_name)) > 0)
);
