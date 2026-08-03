revoke all on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) from public;
revoke execute on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) from anon;
grant execute on function public.write_admin_audit(text, text, text, text, jsonb, jsonb) to authenticated;
