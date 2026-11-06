CREATE OR REPLACE FUNCTION public.get_current_vehicle_hours()
RETURNS TABLE (datum DATE, betriebsstunden NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entries.datum, entries.betriebsstunden
  FROM public.vehicle_hours_entries AS entries
  ORDER BY entries.datum DESC, entries.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_vehicle_hours() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_vehicle_hours() TO authenticated;