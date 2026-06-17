
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS consultor text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nota numeric;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origem text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tempo_decisao text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS objetivo text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS exclusividade boolean DEFAULT true;
