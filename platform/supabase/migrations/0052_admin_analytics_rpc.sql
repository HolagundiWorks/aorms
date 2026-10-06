-- SysDeX analytics aggregates in SQL (roadmap P3 "SQL views for admin aggregates").
-- The /admin/analytics page used to pull whole tables (licences, companies, applications,
-- 12 months of payments, open tickets) into Node to count them. One function now returns
-- the same numbers as jsonb. Service role only; the page gates on SUPER_ADMIN before calling.
create or replace function public.admin_analytics(p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'studios',  (select count(*) from public.studios),
    'accounts', (select count(*) from public.accounts),
    'quotes',   (select count(*) from connectdex.quote_requests),
    'plan_mix', coalesce((select jsonb_agg(jsonb_build_object('k', plan, 'n', n) order by n desc)
                          from (select plan, count(*) n from public.licences group by plan) t), '[]'),
    'app_funnel', coalesce((select jsonb_agg(jsonb_build_object('k', status, 'n', n) order by n desc)
                          from (select status, count(*) n from connectdex.connectdex_applications group by status) t), '[]'),
    'company_status', coalesce((select jsonb_agg(jsonb_build_object('k', status, 'n', n) order by n desc)
                          from (select status, count(*) n from connectdex.companies group by status) t), '[]'),
    'tier_mix', coalesce((select jsonb_agg(jsonb_build_object('k', tier, 'n', n) order by n desc)
                          from (select coalesce(tier, '—') tier, count(*) n from connectdex.companies group by 1) t), '[]'),
    'revenue', coalesce((select jsonb_agg(jsonb_build_object('m', m, 'src', src, 'paise', paise))
                         from (
                           select to_char(created_at at time zone 'UTC', 'YYYY-MM') m, 'licence' src, sum(amount_paise)::bigint paise
                             from public.payments where status = 'CAPTURED' and created_at >= p_since group by 1
                           union all
                           select to_char(created_at at time zone 'UTC', 'YYYY-MM'), 'identity', sum(amount_paise)::bigint
                             from public.identity_payments where status = 'CAPTURED' and created_at >= p_since group by 1
                           union all
                           select to_char(created_at at time zone 'UTC', 'YYYY-MM'), 'connectdex', sum(amount_paise)::bigint
                             from connectdex.connectdex_payments where status = 'CAPTURED' and created_at >= p_since group by 1
                         ) t), '[]'),
    'ticket_age', (select jsonb_build_object(
                     'lt1', count(*) filter (where age < interval '1 day'),
                     'd1_3', count(*) filter (where age >= interval '1 day' and age < interval '3 days'),
                     'd3_7', count(*) filter (where age >= interval '3 days' and age < interval '7 days'),
                     'gt7', count(*) filter (where age >= interval '7 days'))
                   from (select now() - created_at age from public.support_tickets where status in ('OPEN', 'IN_PROGRESS')) t)
  );
$$;
revoke execute on function public.admin_analytics(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_analytics(timestamptz) to service_role;
