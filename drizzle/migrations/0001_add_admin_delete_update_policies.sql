CREATE POLICY "Admins can delete all time entries"
ON public.time_entries
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all diesel entries"
ON public.diesel_entries
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all diesel entries"
ON public.diesel_entries
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all expenses"
ON public.expenses
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all expenses"
ON public.expenses
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all kasse entries"
ON public.kasse_tageskarten
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all kasse entries"
ON public.kasse_tageskarten
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all loipen protokoll entries"
ON public.loipen_protokoll_entries
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all loipen protokoll entries"
ON public.loipen_protokoll_entries
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));