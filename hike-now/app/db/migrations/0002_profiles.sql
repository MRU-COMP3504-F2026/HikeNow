-- Preserve unknown dates for existing records rather than inventing history.
ALTER TABLE public.hiker ADD COLUMN IF NOT EXISTS joined_at timestamptz;
ALTER TABLE public.hiker ALTER COLUMN joined_at SET DEFAULT now();
ALTER TABLE public.review ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.review ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT (joined_at) ON public.hiker TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT (joined_at) ON public.hiker TO authenticated;
  END IF;
END $$;
