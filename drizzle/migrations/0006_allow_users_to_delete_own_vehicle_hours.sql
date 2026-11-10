GRANT DELETE ON public.vehicle_hours_entries TO authenticated;

CREATE POLICY "Users can delete their own vehicle hours"
ON public.vehicle_hours_entries FOR DELETE TO authenticated
USING (auth.uid() = user_id);