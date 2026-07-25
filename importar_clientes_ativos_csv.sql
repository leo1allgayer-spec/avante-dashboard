-- Rode setup_gestao_clientes.sql antes deste arquivo.
-- Este arquivo importa para o usuario digitalavante3@gmail.com.
-- Importa os clientes ativos exportados do Lovable para public.gestao_clients.

insert into public.gestao_clients (
  user_id,
  name,
  company,
  instagram,
  manager,
  status,
  payment_status,
  monthly_budget,
  payment_date,
  commission_value,
  contract_value,
  last_balance_date,
  balance_note,
  last_report_date,
  report_day,
  last_account_update,
  start_date,
  next_charge_date,
  notes
)
values
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'GUSTAVO MARTINS', '', null, 'Nicolas', 'Ativo', 'a receber', 0.00, 15, 100.00, 0.00, '2026-07-13', '', '2026-07-24', 'Sexta-feira', '2026-07-24', null, null, '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'GUSTAVO VIDEO MAKER', '', '@videoguh', 'Lucas', 'Ativo', 'permuta', 1000.00, 30, 100.00, 0.00, '2026-07-17', '', '2026-07-24', 'Sexta-feira', '2026-07-24', '2024-04-01', '2024-04-01', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'CASA IDEAL', '', '@casaidealconstr...', 'Lucas', 'Ativo', 'permuta', 2800.00, 15, 100.00, 0.00, '2026-07-17', '', '2026-07-22', 'Sexta-feira', '2026-07-22', '2025-11-11', '2025-11-11', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'EXCLUSIVEMOTORS RIFA', '', '@exclusivemotors...', 'Lucas', 'Ativo', 'pago', 10000.00, 30, 400.00, 2500.00, '2026-07-18', '', '2026-07-24', 'Sexta-feira', '2026-07-24', '2025-10-02', '2025-10-02', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'VAAPTY', '', null, 'Nicolas', 'Ativo', 'a receber', 8000.00, 1, 250.00, 2500.00, '2026-07-20', '', '2026-07-20', 'Segunda-feira', '2026-07-20', null, null, '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'MEGA PERINI', '', '@megas.perini', 'Lucas', 'Ativo', 'a receber', 0.00, 15, 200.00, 2000.00, '2026-07-20', '', '2026-07-20', 'Segunda-feira', '2026-07-20', '2026-05-15', '2026-05-15', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'PRIME', '', '@distribuidoraprim...', 'Nicolas', 'Ativo', 'pago', 1200.00, 15, 100.00, 800.00, '2026-07-20', '', '2026-07-20', 'Segunda-feira', '2026-07-20', '2025-08-09', '2025-08-09', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'IPHONES NH', '', '@iphones_novohai...', 'Nicolas', 'Ativo', 'pago', 4000.00, 15, 100.00, 1000.00, '2026-07-20', '', '2026-07-21', 'Segunda-feira', '2026-07-24', '2023-08-28', '2023-08-28', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'IDEAL MADEIREIRA', '', '@idealmadeiras_n...', 'Nicolas', 'Ativo', 'permuta', 9600.00, 15, 100.00, 0.00, '2026-07-20', '', '2026-07-22', 'Terca-feira', '2026-07-22', '2025-04-14', '2025-04-14', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'ASSESSORIA RHYAN', '', null, 'Leonardo', 'Ativo', 'a receber', 0.00, 30, 100.00, 0.00, '2026-07-21', '', '2026-07-21', 'Segunda-feira', '2026-07-21', null, null, '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'ASSESSORIA BENICIO', '', null, 'Leonardo', 'Ativo', 'a receber', 0.00, 30, 100.00, 0.00, '2026-07-21', '', '2026-07-21', 'Segunda-feira', '2026-07-21', null, null, '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'BIKE CAMRABA', '', '@ciclo_cambara', 'Nicolas', 'Ativo', 'a receber', 1000.00, 30, 160.00, 4700.00, '2026-07-21', '', '2026-07-22', 'Terca-feira', '2026-07-22', '2026-05-30', '2026-05-30', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'NOVA ERA COSMETICO', '', '@lojasnovaeracos...', 'Lucas', 'Ativo', 'a receber', 10000.00, 30, 300.00, 4000.00, '2026-07-21', '', '2026-07-21', 'Quarta-feira', '2026-07-21', '2026-03-20', '2026-03-20', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'PONTO DO EQUILIBRIO', '', '@pontodeequilibri...', 'Nicolas', 'Ativo', 'pago', 400.00, 30, 100.00, 800.00, '2026-07-21', '', '2026-07-24', 'Sexta-feira', '2026-07-24', '2026-02-12', '2026-02-12', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'DIVA EM MOVIMENTO', '', '@divaemmoviment...', 'Lucas', 'Ativo', 'pago', 450.00, 30, 130.00, 1300.00, '2026-07-22', '', '2026-07-20', 'Segunda-feira', '2026-07-20', '2026-04-24', '2026-04-24', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'BODEGAS', '', '@bodegas.burger...', 'Lucas', 'Ativo', 'atrasado', 2000.00, 30, 100.00, 600.00, '2026-07-22', '', '2026-07-23', 'Sexta-feira', '2026-07-23', '2024-04-01', '2024-04-01', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'TCHE VIAGENS', '', null, 'Nicolas', 'Ativo', 'a receber', 0.00, 30, 0.00, 0.00, '2026-07-23', '', '2026-07-23', 'Segunda-feira', '2026-07-23', null, null, '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'LANCA LOOK', '', '@lancalook_', 'Nicolas', 'Ativo', 'a receber', 240.00, 30, 100.00, 0.00, '2026-07-23', '', '2026-07-23', 'Segunda-feira', '2026-07-23', '2026-05-26', '2026-05-26', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'PERFUMARIA NOVO VICIO', '', '@perfumes.novovi...', 'Nicolas', 'Ativo', 'a receber', 1000.00, 30, 150.00, 1500.00, '2026-07-24', '', '2026-07-20', 'Segunda-feira', '2026-07-20', '2026-05-31', '2026-05-31', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'ASSESSORIA GVD', '', '@giovaneduprat_', 'Nicolas', 'Ativo', 'a receber', 0.00, 15, 180.00, 1800.00, '2026-07-24', '', '2026-07-24', 'Segunda-feira', '2026-07-24', '2026-05-15', '2026-05-15', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'PIX CARRAO', '', '@pixcarrao/', 'Lucas', 'Ativo', 'pago', 36000.00, 30, 150.00, 1500.00, '2026-07-24', '', '2026-07-20', 'Segunda-feira', '2026-07-22', '2025-10-29', '2025-10-29', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'FACILITA AUTOCAR', '', '@rafaomotta/', 'Nicolas', 'Ativo', 'pago', 0.00, 30, 144.00, 1000.00, '2026-07-24', '', '2026-07-24', 'Sexta-feira', '2026-07-24', '2025-10-24', '2025-10-24', '[]'::jsonb),
((select id from auth.users where email = 'digitalavante3@gmail.com' limit 1), 'DR. QUELI', '', '@draquelilenz', 'Lucas', 'Ativo', 'pago', 900.00, 30, 100.00, 600.00, '2026-07-24', '', '2026-07-24', 'Sexta-feira', '2026-07-24', '2024-11-13', '2024-11-13', '[]'::jsonb)
on conflict do nothing;

select pg_notify('pgrst', 'reload schema');

