-- KR-030: preferred time is optional for demos and absent for applications.

alter table marketing.marketing_leads
  drop constraint if exists marketing_leads_demo_time;

alter table marketing.marketing_leads
  add constraint marketing_leads_demo_time
  check (intent = 'demo' or preferred_time is null);
