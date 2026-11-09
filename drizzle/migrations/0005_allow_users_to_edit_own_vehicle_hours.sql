GRANT UPDATE ON public.vehicle_hours_entries TO authenticated;

CREATE POLICY "Users can update their own vehicle hours"
ON public.vehicle_hours_entries FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);