ALTER TABLE public.meetings ADD COLUMN status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.meetings ADD COLUMN outcome text DEFAULT null;