
-- Change arbeit column from enum to text to support dynamic task names
ALTER TABLE public.time_entries ALTER COLUMN arbeit TYPE text USING arbeit::text;

-- Drop the work_type enum (no longer needed)
DROP TYPE IF EXISTS public.work_type;

-- Add column_key to loipen_config to map to loipen_protokoll columns
ALTER TABLE public.loipen_config ADD COLUMN IF NOT EXISTS column_key text;

-- Update existing loipen_config rows with their column keys
UPDATE public.loipen_config SET column_key = 'schwanden_nidfurn' WHERE name = 'Schwanden - Nidfurn';
UPDATE public.loipen_config SET column_key = 'nidfurn_leuggelbach' WHERE name = 'Nidfurn - Leuggelbach';
UPDATE public.loipen_config SET column_key = 'rundkurs_leuggelbach' WHERE name = 'Rundkurs Leuggelbach';
UPDATE public.loipen_config SET column_key = 'luchsingen_skistuebli' WHERE name = 'Luchsingen - Skistübli';
UPDATE public.loipen_config SET column_key = 'haetzingen_linthal' WHERE name = 'Hätzingen - Linthal';
UPDATE public.loipen_config SET column_key = 'saeatli_boden' WHERE name = 'Säätliboden (Rüti GL)';
UPDATE public.loipen_config SET column_key = 'skilift_lo' WHERE name = 'Skilift Loh';
