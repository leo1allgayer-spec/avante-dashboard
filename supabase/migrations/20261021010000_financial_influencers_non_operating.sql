begin;
alter table public.financial_monthly_expenses drop constraint if exists financial_monthly_expenses_category_check;
alter table public.financial_monthly_expenses add constraint financial_monthly_expenses_category_check
check(category in ('fixed','variable','investment','influencers','non_operating','taxes','sales_commission','operational_commission'));
commit;
