begin;
alter table public.client_weekly_performance add column campaign_id text not null default 'account';
alter table public.client_weekly_performance add constraint weekly_campaign_scope_valid check(campaign_id='account' or campaign_id ~ '^[0-9]+$');
alter table public.client_weekly_performance add column purchases integer check(purchases>=0);
alter table public.client_weekly_performance add column revenue numeric(16,2) check(revenue>=0);
alter table public.client_weekly_performance add column cost_per_purchase numeric(16,4) check(cost_per_purchase>=0);
alter table public.client_weekly_performance drop constraint client_weekly_performance_client_id_week_start_key;
alter table public.client_weekly_performance add constraint client_weekly_campaign_week_unique unique(client_id,week_start,campaign_id);
commit;
