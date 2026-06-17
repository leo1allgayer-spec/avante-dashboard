
CREATE TABLE public.booking_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_advance_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booking settings" ON public.booking_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can update booking settings" ON public.booking_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.booking_settings (min_advance_minutes) VALUES (60);
