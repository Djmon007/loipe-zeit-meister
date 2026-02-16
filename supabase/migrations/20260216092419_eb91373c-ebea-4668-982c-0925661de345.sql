
-- Allow users to delete their own diesel entries
CREATE POLICY "Users can delete their own diesel entries"
ON public.diesel_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own expenses
CREATE POLICY "Users can delete their own expenses"
ON public.expenses
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own kasse entries
CREATE POLICY "Users can delete their own kasse entries"
ON public.kasse_tageskarten
FOR DELETE
USING (auth.uid() = user_id);
