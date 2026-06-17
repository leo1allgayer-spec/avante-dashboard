CREATE TABLE public.whatsapp_message_timing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type text NOT NULL UNIQUE,
  offset_value integer NOT NULL DEFAULT 1,
  offset_unit text NOT NULL DEFAULT 'hours',
  direction text NOT NULL DEFAULT 'before',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.whatsapp_message_timing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view timing" ON public.whatsapp_message_timing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update timing" ON public.whatsapp_message_timing FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can insert timing" ON public.whatsapp_message_timing FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default values
INSERT INTO public.whatsapp_message_timing (message_type, offset_value, offset_unit, direction) VALUES
  ('reminder_24h', 24, 'hours', 'before'),
  ('reminder_1h', 1, 'hours', 'before'),
  ('post_course', 7, 'days', 'after');