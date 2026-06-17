
CREATE TABLE public.meeting_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  participant_name text NOT NULL,
  phone text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  UNIQUE (meeting_id, participant_name)
);

ALTER TABLE public.meeting_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reminder logs"
  ON public.meeting_reminder_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can insert reminder logs"
  ON public.meeting_reminder_logs FOR INSERT TO authenticated, anon
  WITH CHECK (true);
