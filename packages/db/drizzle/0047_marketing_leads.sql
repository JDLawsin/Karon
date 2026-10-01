-- KR-030: isolated marketing lead store and shared atomic public-form limiter.

create schema if not exists marketing;

revoke all on schema marketing from public, anon, authenticated;
grant usage on schema marketing to service_role;

create table marketing.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  intent text not null check (intent in ('application', 'demo')),
  name text not null check (char_length(name) between 1 and 100),
  clinic_name text not null check (char_length(clinic_name) between 1 and 120),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  province text check (province is null or char_length(province) <= 100),
  city text not null check (char_length(city) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  clinic_size text not null check (clinic_size in ('1_chair', '2_chairs', '3_plus')),
  role text not null check (role in ('owner_dentist', 'associate_dentist', 'clinic_manager', 'assistant_front_desk', 'other')),
  mobile text check (mobile is null or char_length(mobile) <= 40),
  mobile_country_code text check (mobile_country_code is null or mobile_country_code ~ '^[A-Z]{2}$'),
  preferred_time text check (preferred_time is null or preferred_time in ('weekday_morning', 'weekday_lunch', 'weekday_evening', 'saturday')),
  message text check (message is null or char_length(message) <= 500),
  privacy_acknowledged_at timestamptz not null,
  privacy_notice_version text not null check (char_length(privacy_notice_version) between 1 and 40),
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  marketing_purpose text check (marketing_purpose is null or marketing_purpose = 'launch_updates'),
  marketing_wording_version text check (marketing_wording_version is null or char_length(marketing_wording_version) between 1 and 40),
  marketing_source_page text check (marketing_source_page is null or marketing_source_page = '/demo'),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  utm_term text check (utm_term is null or char_length(utm_term) <= 100),
  utm_content text check (utm_content is null or char_length(utm_content) <= 100),
  landing_path text check (landing_path is null or (char_length(landing_path) <= 200 and landing_path like '/%' and landing_path not like '%?%')),
  referrer_domain text check (referrer_domain is null or char_length(referrer_domain) <= 253),
  heard_about_source text check (heard_about_source is null or heard_about_source in ('search', 'facebook', 'colleague', 'dental_group', 'event', 'other')),
  heard_about_other text check (heard_about_other is null or char_length(heard_about_other) <= 100),
  status text not null default 'new' check (status in ('new', 'demo_held', 'application_accepted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_leads_demo_time check (intent = 'demo' or preferred_time is null),
  constraint marketing_leads_opt_in_evidence check (
    marketing_opt_in = (marketing_opt_in_at is not null)
    and marketing_opt_in = (marketing_purpose is not null)
    and marketing_opt_in = (marketing_wording_version is not null)
    and marketing_opt_in = (marketing_source_page is not null)
  )
);

alter table marketing.marketing_leads enable row level security;
alter table marketing.marketing_leads force row level security;
revoke all on table marketing.marketing_leads from public, anon, authenticated;
grant select, insert, update, delete on table marketing.marketing_leads to service_role;

create table if not exists private.rate_limit_buckets (
  key_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null check (hits > 0),
  expires_at timestamptz not null,
  primary key (key_hash, window_started_at)
);

revoke all on table private.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table private.rate_limit_buckets to service_role;

create or replace function private.rate_limit_hit(
  p_key text,
  p_window interval,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_seconds double precision := extract(epoch from p_window);
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_key = '' or v_window_seconds <= 0 or p_max <= 0 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );

  delete from private.rate_limit_buckets where expires_at < v_now;

  insert into private.rate_limit_buckets (
    key_hash, window_started_at, hits, expires_at
  ) values (
    p_key, v_window_start, 1, v_window_start + p_window * 2
  )
  on conflict (key_hash, window_started_at)
  do update set hits = private.rate_limit_buckets.hits + 1
  returning hits into v_hits;

  return v_hits > p_max;
end;
$$;

revoke all on function private.rate_limit_hit(text, interval, integer)
  from public, anon, authenticated;
grant execute on function private.rate_limit_hit(text, interval, integer)
  to service_role;

notify pgrst, 'reload schema';
