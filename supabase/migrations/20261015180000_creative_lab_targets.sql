create table if not exists public.creative_lab_targets (
 account_id text not null check(account_id ~ '^act_[0-9]+$'),
 result_type text not null check(result_type in ('sales','leads','messages','purchases','clicks','engagement')),
 cpr numeric, min_impressions integer not null default 1000, min_results integer not null default 5,
 min_spend numeric not null default 0, ctr_floor numeric, frequency_ceiling numeric, change_threshold numeric not null default 20,
 updated_at timestamptz not null default now(),
 primary key(account_id,result_type),
 check(cpr is null or cpr>0), check(min_impressions>0), check(min_results>0), check(min_spend>=0),
 check(ctr_floor is null or ctr_floor between 0 and 100), check(frequency_ceiling is null or frequency_ceiling>=1), check(change_threshold>0)
);
alter table public.creative_lab_targets enable row level security;
revoke all on public.creative_lab_targets from anon, authenticated;
grant all on public.creative_lab_targets to service_role;
