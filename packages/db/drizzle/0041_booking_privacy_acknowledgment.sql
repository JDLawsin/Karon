-- KR-020: keep historical requests unmarked; new requests record the notice version
-- and server receipt time only after the booking endpoint validates acknowledgment.

alter table public.booking_requests
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_acknowledged_at timestamptz;

alter table public.booking_requests
  drop constraint if exists booking_requests_privacy_ack_pair,
  add constraint booking_requests_privacy_ack_pair
    check ((privacy_notice_version is null) = (privacy_acknowledged_at is null)),
  drop constraint if exists booking_requests_privacy_notice_version_length,
  add constraint booking_requests_privacy_notice_version_length
    check (
      privacy_notice_version is null
      or char_length(privacy_notice_version) between 1 and 80
    );

notify pgrst, 'reload schema';
