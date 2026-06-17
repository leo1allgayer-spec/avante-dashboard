
-- Templates de mensagens WhatsApp
CREATE TABLE public.whatsapp_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL UNIQUE,
  message_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view templates" ON public.whatsapp_message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert templates" ON public.whatsapp_message_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update templates" ON public.whatsapp_message_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete templates" ON public.whatsapp_message_templates FOR DELETE TO authenticated USING (true);

-- Inserir templates padrão
INSERT INTO public.whatsapp_message_templates (type, message_template) VALUES
('confirmation', E'Olá, {{nome}}! ✅\n\nSua vaga no curso foi confirmada com sucesso!\n\n📅 Curso: {{curso}}\n🗓️ Data: {{data_agendamento}}\n\nSe precisar de algo, é só responder aqui 🚀'),
('reminder_24h', E'Olá, {{nome}}! ⏰\n\nPassando para te lembrar que seu curso acontece amanhã!\n\n📅 Curso: {{curso}}\n🗓️ Data: {{data_agendamento}}\n\nCaso não consiga comparecer, ainda dá tempo de remarcar para não perder o seu sinal. Me chama aqui que te ajudo com isso 👍'),
('reminder_1h', E'Olá, {{nome}}! ⚠️\n\nSeu curso começa em 1 hora!\n\n📅 Curso: {{curso}}\n🗓️ Data: {{data_agendamento}}'),
('post_course', E'Parabéns pela conclusão, {{nome}}! 👏\n\nPra alunos do curso {{curso}}, liberamos uma condição especial para o próximo nível 🚀\n\nÉ a forma mais rápida de você evoluir e não perder o que aprendeu.\n\nQuer que eu te envie os detalhes?');

-- Logs de mensagens enviadas
CREATE TABLE public.whatsapp_message_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.course_bookings(id) ON DELETE SET NULL,
  phone text NOT NULL,
  student_name text NOT NULL,
  course_name text NOT NULL,
  message_type text NOT NULL,
  message_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view logs" ON public.whatsapp_message_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs" ON public.whatsapp_message_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update logs" ON public.whatsapp_message_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can insert logs" ON public.whatsapp_message_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update logs" ON public.whatsapp_message_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Mensagens agendadas
CREATE TABLE public.whatsapp_scheduled_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.course_bookings(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scheduled" ON public.whatsapp_scheduled_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert scheduled" ON public.whatsapp_scheduled_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update scheduled" ON public.whatsapp_scheduled_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete scheduled" ON public.whatsapp_scheduled_messages FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon can insert scheduled" ON public.whatsapp_scheduled_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update scheduled" ON public.whatsapp_scheduled_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Adicionar coluna course_status ao course_bookings
ALTER TABLE public.course_bookings ADD COLUMN IF NOT EXISTS course_status text NOT NULL DEFAULT 'confirmado';
