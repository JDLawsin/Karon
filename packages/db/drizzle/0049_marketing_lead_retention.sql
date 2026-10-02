-- KR-031: keep scheduled retention deletion indexed without choosing the pending period.

create index marketing_leads_created_at_idx
  on marketing.marketing_leads (created_at);
