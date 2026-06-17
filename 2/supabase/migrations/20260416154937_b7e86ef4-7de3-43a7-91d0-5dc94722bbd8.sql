ALTER TABLE public.pagamentos_variaveis
ADD COLUMN dia_pagamento integer NOT NULL DEFAULT 15,
DROP COLUMN pago_dia_15,
DROP COLUMN pago_dia_30;