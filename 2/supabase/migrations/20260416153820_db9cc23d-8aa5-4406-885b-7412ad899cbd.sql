ALTER TABLE public.pagamentos_variaveis
ADD COLUMN pago_dia_15 boolean NOT NULL DEFAULT false,
ADD COLUMN pago_dia_30 boolean NOT NULL DEFAULT false;