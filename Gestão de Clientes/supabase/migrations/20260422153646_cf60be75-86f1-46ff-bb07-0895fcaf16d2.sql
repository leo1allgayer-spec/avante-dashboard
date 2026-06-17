UPDATE public.whatsapp_message_logs
SET error_message = 'Provedor d-api.cloud indisponível (erro 520 - Cloudflare)'
WHERE error_message LIKE '%DOCTYPE%' OR error_message LIKE '%cloudflare%';