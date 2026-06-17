## Plano: Integração WhatsApp via D-API

### 1. Banco de Dados (Migrações)

**Tabela `whatsapp_message_templates`** — Templates editáveis das mensagens

- `type`: confirmation | reminder_24h | reminder_1h | post_course
- `message_template`: texto da mensagem com variáveis {{nome}}, {{curso}}, {{data_agendamento}}
- `is_active`: ativar/desativar cada automação

**Tabela `whatsapp_message_logs`** — Logs de envio

- `booking_id`, `phone`, `student_name`, `course_name`
- `message_type`: confirmation | reminder_24h | reminder_1h | post_course
- `status`: pending | sent | error
- `sent_at`, `error_message`

**Tabela `whatsapp_scheduled_messages`** — Agendamento de mensagens futuras

- `booking_id`, `message_type`, `scheduled_for` (timestamp)
- `status`: pending | sent | error | cancelled

**Atualização `course_bookings`** — Adicionar coluna `course_status`:

- Valores: agendado | confirmado | concluído | cancelado

### 2. Secrets (Backend)

- `D_API_KEY` — API Key da D-API
- `D_API_SESSION_ID` — AvanteDigital

### 3. Edge Functions

**`whatsapp-send`** — Envio de mensagem via D-API

- Recebe: phone, text
- Formata telefone (55 + DDD + número)
- Envia via D-API SDK (POST para API)
- Registra log

**`whatsapp-trigger`** — Disparada após confirmação de agendamento

- Envia confirmação imediata
- Agenda: lembrete 24h antes, 1h antes, pós-curso 3h após

**`whatsapp-scheduler`** — Cron job (a cada 5 min)

- Busca mensagens agendadas com `scheduled_for <= now()` e `status = pending`
- Envia cada uma e atualiza status
- Evita duplicatas

### 4. Painel Admin (UI)

**Nova aba ou seção em /admin/agendamentos:**

- Editar templates de mensagens
- Ativar/desativar cada automação
- Ver logs de envio (nome, telefone, curso, tipo, status, data/hora)
- Botão para reenviar mensagem manualmente
- Controle de status do curso (agendado → confirmado → concluído → cancelado)

### 5. Integração com Fluxo Existente

- Após booking confirmado em `/agendar`, chamar edge function `whatsapp-trigger`
- Trigger automático ao criar booking no banco
