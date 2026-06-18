revoke execute on function public.consume_generation_entitlement(uuid) from public, anon;
revoke execute on function public.refund_generation_entitlement(uuid, text) from public, anon;

grant execute on function public.consume_generation_entitlement(uuid) to authenticated;
grant execute on function public.refund_generation_entitlement(uuid, text) to authenticated;
