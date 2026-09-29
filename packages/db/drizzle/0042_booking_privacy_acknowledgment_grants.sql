-- KR-020: clinic members may move a request through the inbox workflow, but the
-- public booking endpoint's privacy acknowledgment remains server-owned evidence.

revoke update on table public.booking_requests from authenticated;

grant update (status, visit_id, updated_at)
  on table public.booking_requests
  to authenticated;

notify pgrst, 'reload schema';
