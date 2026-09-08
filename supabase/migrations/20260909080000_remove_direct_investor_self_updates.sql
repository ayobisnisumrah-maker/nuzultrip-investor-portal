-- Investor profile/application writes are mediated by server-side service-role
-- workflows with explicit field allow-lists. Direct authenticated UPDATE access
-- to the investor domain row is therefore unnecessary and too broad: the old
-- self policy allowed a prospective/rejected investor to target administrative
-- lifecycle metadata as long as the row remained in an allowed status.
--
-- Keep SELECT-self so an applicant can see their lifecycle state. Admin UPDATE
-- remains governed by investors_update_admin and its RBAC permission.

drop policy if exists investors_update_self on public.investors;
