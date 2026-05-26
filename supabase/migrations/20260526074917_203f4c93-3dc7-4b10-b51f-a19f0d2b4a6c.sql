
drop policy "anyone can submit lead" on public.leads;
create policy "anyone can submit lead" on public.leads
  for insert to anon, authenticated
  with check (length(admin_name) > 0 and length(group_name) > 0 and length(contact) > 0);

revoke execute on function public.is_community_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_community_admin(uuid) to authenticated;
