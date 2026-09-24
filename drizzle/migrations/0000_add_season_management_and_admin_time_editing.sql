CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_year INTEGER NOT NULL UNIQUE CHECK (start_year >= 2025 AND start_year <= 9998),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.seasons TO authenticated;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view seasons"
ON public.seasons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage seasons"
ON public.seasons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all time entries"
ON public.time_entries FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.seasons (start_year)
VALUES (2025), (2026)
ON CONFLICT (start_year) DO NOTHING;