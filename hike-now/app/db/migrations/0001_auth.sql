CREATE UNIQUE INDEX IF NOT EXISTS hiker_email_normalized_unique ON public.hiker (lower(email));

CREATE TABLE IF NOT EXISTS public.hiker_session (
  token_hash varchar(64) PRIMARY KEY,
  hiker_id uuid NOT NULL REFERENCES public.hiker(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.hiker_session ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hiker_session FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.auth_attempt (
  key varchar(64) PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
ALTER TABLE public.auth_attempt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_attempt FROM PUBLIC;

-- Public profile reads must never expose password hashes.
REVOKE SELECT ON public.hiker FROM PUBLIC;
REVOKE SELECT (password) ON public.hiker FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE SELECT ON public.hiker FROM anon;
    REVOKE SELECT (password) ON public.hiker FROM anon;
    GRANT SELECT (id, email, description) ON public.hiker TO anon;
    REVOKE ALL ON public.hiker_session FROM anon;
    REVOKE ALL ON public.auth_attempt FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE SELECT ON public.hiker FROM authenticated;
    REVOKE SELECT (password) ON public.hiker FROM authenticated;
    GRANT SELECT (id, email, description) ON public.hiker TO authenticated;
    REVOKE ALL ON public.hiker_session FROM authenticated;
    REVOKE ALL ON public.auth_attempt FROM authenticated;
  END IF;
END $$;
