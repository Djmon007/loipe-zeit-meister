CREATE TABLE public.vehicle_hours_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  betriebsstunden NUMERIC(10, 1) NOT NULL CHECK (betriebsstunden >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.vehicle_hours_entries TO authenticated;
GRANT ALL ON public.vehicle_hours_entries TO service_role;

ALTER TABLE public.vehicle_hours_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vehicle hours"
ON public.vehicle_hours_entries FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicle hours"
ON public.vehicle_hours_entries FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all vehicle hours"
ON public.vehicle_hours_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX vehicle_hours_entries_datum_user_idx
ON public.vehicle_hours_entries (datum DESC, user_id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));