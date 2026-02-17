
-- Create dynamic loipen protokoll entries table
CREATE TABLE public.loipen_protokoll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  loipe_config_id UUID NOT NULL REFERENCES public.loipen_config(id) ON DELETE CASCADE,
  skating BOOLEAN NOT NULL DEFAULT false,
  klassisch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, datum, loipe_config_id)
);

-- Enable RLS
ALTER TABLE public.loipen_protokoll_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own entries"
ON public.loipen_protokoll_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
ON public.loipen_protokoll_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
ON public.loipen_protokoll_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
ON public.loipen_protokoll_entries FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all entries"
ON public.loipen_protokoll_entries FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
