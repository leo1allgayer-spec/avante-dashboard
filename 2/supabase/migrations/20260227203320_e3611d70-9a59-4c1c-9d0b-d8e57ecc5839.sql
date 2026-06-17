
-- Add extra columns to clients table for lead details
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS celular text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS enviado text;
