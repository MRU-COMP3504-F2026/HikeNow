-- Optional chosen name; NULL keeps the email-derived name for existing hikers.
ALTER TABLE public.hiker ADD COLUMN IF NOT EXISTS display_name varchar(50);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT (display_name) ON public.hiker TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT (display_name) ON public.hiker TO authenticated;
  END IF;
END $$;
