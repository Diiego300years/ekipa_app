-- Grants required by the isolated server-side push delivery module so it can
-- read subscriptions for fan-out and delete invalid subscriptions.

grant usage on schema public to service_role;
grant select, delete on table public.push_subscriptions to service_role;
