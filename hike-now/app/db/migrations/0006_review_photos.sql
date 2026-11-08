-- Public bucket for review photos. Limits mirror Supabase's standard-upload guidance (<= 6MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hike-reviews', 'hike-reviews', true, 6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- HikeNow uses its own session cookies, so Storage sees requests as anon. The server action
-- only signs upload URLs for signed-in hikers; this policy lets those signed URLs be created.
DROP POLICY IF EXISTS "Review photo uploads" ON storage.objects;
CREATE POLICY "Review photo uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'hike-reviews' AND (storage.foldername(name))[1] = 'reviews');
