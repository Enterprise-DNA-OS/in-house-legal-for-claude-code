-- In-House Legal for Claude Code: the records an in-house legal team runs on.
-- Portable Postgres (PGlite and any hosted Postgres). Money is stored in cents.
create table settings (key text primary key, value integer not null check(value>=0), note text not null default '');
insert into settings values
 ('triage_days',2,'Office service level: working days a new request may wait before someone triages it'),
 ('quiet_days',21,'Office policy: an open matter with no note for this many days is flagged as quiet'),
 ('renewal_window_days',90,'Look-ahead for contract notice deadlines'),
 ('key_date_window_days',60,'Look-ahead for court, regulator, filing and limitation dates'),
 ('budget_alert_pct',90,'Flag outside counsel spend at or above this share of the matter budget'),
 ('cpd_hours',10,'Yearly CPD minimum for each lawyer (NZ and Uniform Law states: 10)'),
 ('max_open_high_risk',3,'Office policy: high-risk matters one lawyer can hold before the workload flag');
create table business_units (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 leader text not null default '', cost_centre text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table people (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 kind text not null default 'requester' check(kind in ('lawyer','paralegal','requester')),
 business_unit_id uuid references business_units, email text not null default '',
 jurisdiction text not null default 'NZ' check(jurisdiction in ('NZ','NSW','VIC','WA','QLD','SA','ACT','TAS','NT')),
 practising_until date, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table firms (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 panel boolean not null default false, contact text not null default '', email text not null default '',
 rate_note text not null default '', panel_until date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table matters (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 business_unit_id uuid not null references business_units, owner_id uuid not null references people,
 category text not null default 'advice' check(category in ('advice','contract','dispute','employment','regulatory','corporate','privacy','property','ip')),
 risk text not null default 'low' check(risk in ('low','medium','high')),
 status text not null default 'open' check(status in ('open','on_hold','closed')),
 opened_on date not null default current_date, closed_on date, outcome text not null default '',
 next_step text not null default '', next_step_due date,
 firm_id uuid references firms, budget_cents bigint not null default 0 check(budget_cents>=0),
 privileged boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'closed' or (closed_on is not null and length(trim(outcome))>0)),
 check(closed_on is null or closed_on>=opened_on));
create table requests (
 id uuid primary key default gen_random_uuid(), ref text unique not null, title text not null,
 business_unit_id uuid not null references business_units, requester_id uuid references people,
 category text not null default 'advice' check(category in ('advice','contract','dispute','employment','regulatory','corporate','privacy','property','ip')),
 urgency text not null default 'normal' check(urgency in ('low','normal','high')),
 received_on date not null default current_date, needed_by date,
 status text not null default 'new' check(status in ('new','triaged','declined','converted')),
 assigned_to uuid references people, triaged_on date, decision_note text not null default '',
 matter_id uuid references matters,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'converted' or matter_id is not null),
 check(status<>'declined' or length(trim(decision_note))>0),
 check(status='new' or triaged_on is not null));
create table key_dates (
 id uuid primary key default gen_random_uuid(), ref text unique not null, matter_id uuid not null references matters,
 kind text not null default 'other' check(kind in ('court','regulator','filing','limitation','other')),
 due_on date not null, description text not null, done boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table contracts (
 id uuid primary key default gen_random_uuid(), ref text unique not null, title text not null,
 counterparty text not null, business_unit_id uuid not null references business_units, owner_id uuid references people,
 kind text not null default 'supply' check(kind in ('supply','customer','services','licence','lease','nda','employment','other')),
 annual_value_cents bigint not null default 0 check(annual_value_cents>=0),
 status text not null default 'signed' check(status in ('draft','under_review','signed','expired','terminated')),
 start_on date, end_on date, auto_renews boolean not null default false,
 notice_days integer not null default 0 check(notice_days between 0 and 730), renewal_decision text not null default '',
 stored_at text not null default '', matter_id uuid references matters,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_on is null or start_on is null or end_on>=start_on));
create table entities (
 id uuid primary key default gen_random_uuid(), ref text unique not null, name text not null,
 jurisdiction text not null check(jurisdiction in ('NZ','AU')), registration_no text not null,
 filing_month integer check(filing_month between 1 and 12), review_date date,
 last_filed_on date, directors text not null default '', status text not null default 'active' check(status in ('active','removed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((jurisdiction='NZ' and filing_month is not null) or (jurisdiction='AU' and review_date is not null)));
create table invoices (
 id uuid primary key default gen_random_uuid(), ref text unique not null, matter_id uuid not null references matters,
 firm_id uuid not null references firms, invoice_no text not null, invoice_date date not null,
 amount_cents bigint not null check(amount_cents>=0),
 status text not null default 'received' check(status in ('received','approved','disputed','paid')),
 note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(firm_id,invoice_no));
create table cpd (
 id uuid primary key default gen_random_uuid(), ref text unique not null, person_id uuid not null references people,
 activity_on date not null, activity text not null, minutes integer not null check(minutes>0 and minutes<=1440),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table notes (
 id uuid primary key default gen_random_uuid(), ref text unique not null, matter_id uuid not null references matters,
 body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table audit_events (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 action text not null, before_row jsonb, after_row jsonb, actor text not null default current_user,
 created_at timestamptz not null default now());
create function stamp_update() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create function audit_change() returns trigger language plpgsql as $$ begin
 insert into audit_events(entity,record_id,action,before_row,after_row) values(TG_TABLE_NAME,new.id,TG_OP,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;end $$;
create function validate_matter_owner() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from people where id=new.owner_id and kind in ('lawyer','paralegal')) then raise exception 'Matter owner must be on the legal team';end if;return new;end $$;
create trigger matter_owner before insert or update on matters for each row execute function validate_matter_owner();
create function validate_request() returns trigger language plpgsql as $$ begin
 if new.assigned_to is not null and not exists(select 1 from people where id=new.assigned_to and kind in ('lawyer','paralegal')) then raise exception 'Requests are assigned to the legal team';end if;
 if new.status in ('triaged','converted') and new.assigned_to is null then raise exception 'Triaged request needs an assigned lawyer';end if;return new;end $$;
create trigger request_rules before insert or update on requests for each row execute function validate_request();
create function validate_cpd() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from people where id=new.person_id and kind='lawyer') then raise exception 'CPD is recorded for lawyers';end if;return new;end $$;
create trigger cpd_rules before insert or update on cpd for each row execute function validate_cpd();
do $$ declare t text;begin
 foreach t in array array['business_units','people','firms','matters','requests','key_dates','contracts','entities','invoices','cpd','notes'] loop
 execute format('create trigger updated before update on %I for each row execute function stamp_update()',t);
 execute format('create trigger audit after insert or update on %I for each row execute function audit_change()',t);
 execute format('alter table %I enable row level security',t); execute format('revoke all on %I from public',t);
 end loop;end $$;
alter table settings enable row level security; alter table audit_events enable row level security;
revoke all on settings,audit_events from public;
create function setting(k text) returns integer language sql stable as $$ select value from settings where key=k $$;
-- The CPD year runs 1 April to 31 March in New Zealand and the Uniform Law states.
create function cpd_year_start(d date) returns date language sql immutable as $$
 select make_date(extract(year from d)::int - case when extract(month from d)<4 then 1 else 0 end,4,1) $$;

create view v_matters as
 select m.id,m.ref,m.name,b.name business_unit,o.name owner,m.category,m.risk,m.status,m.opened_on,m.closed_on,m.outcome,
 m.next_step,m.next_step_due,f.name firm,m.budget_cents,
 coalesce((select sum(amount_cents) from invoices i where i.matter_id=m.id and i.status<>'disputed'),0) spent_cents,
 (select max(created_at)::date from notes n where n.matter_id=m.id) last_note_on
 from matters m join business_units b on b.id=m.business_unit_id join people o on o.id=m.owner_id left join firms f on f.id=m.firm_id;
create view v_requests as
 select r.id,r.ref,r.title,b.name business_unit,q.name requester,r.category,r.urgency,r.received_on,r.needed_by,r.status,
 a.name assigned_to,r.triaged_on,mt.ref matter,
 case when r.status='new' then current_date-r.received_on else r.triaged_on-r.received_on end days_waiting
 from requests r join business_units b on b.id=r.business_unit_id left join people q on q.id=r.requester_id
 left join people a on a.id=r.assigned_to left join matters mt on mt.id=r.matter_id;
create view v_renewals as
 select c.id,c.ref,c.title,c.counterparty,b.name business_unit,p.name owner,c.end_on,c.auto_renews,c.notice_days,
 c.end_on-c.notice_days notice_by,c.annual_value_cents,c.renewal_decision
 from contracts c join business_units b on b.id=c.business_unit_id left join people p on p.id=c.owner_id
 where c.status='signed' and c.end_on is not null;
create view v_key_dates as
 select k.id,k.ref,m.ref matter,m.name matter_name,o.name owner,k.kind,k.due_on,k.description,k.done,k.due_on-current_date days_left
 from key_dates k join matters m on m.id=k.matter_id join people o on o.id=m.owner_id where m.status<>'closed';
create view v_filings as
 select e.id,e.ref,e.name,e.jurisdiction,e.registration_no,
 case when e.jurisdiction='NZ' then
  (select (make_date(y,e.filing_month,1)+interval '1 month'-interval '1 day')::date from generate_series(extract(year from current_date)::int,extract(year from current_date)::int+1) y
   where (make_date(y,e.filing_month,1)+interval '1 month'-interval '1 day')::date>=current_date
   and (e.last_filed_on is null or e.last_filed_on<make_date(y,e.filing_month,1)) order by y limit 1)
 else
  (select (e.review_date+make_interval(years=>y))::date from generate_series(0,60) y
   where (e.review_date+make_interval(years=>y)+interval '2 months')::date>=current_date
   and (e.last_filed_on is null or e.last_filed_on<(e.review_date+make_interval(years=>y))::date) order by y limit 1)
 end next_due,e.last_filed_on,e.directors
 from entities e where e.status='active';
create view v_spend as
 select m.ref matter,m.name,b.name business_unit,f.name firm,m.budget_cents,
 coalesce(sum(i.amount_cents) filter(where i.status<>'disputed'),0) spent_cents,
 coalesce(sum(i.amount_cents) filter(where i.status='disputed'),0) disputed_cents,
 case when m.budget_cents>0 then round(100.0*coalesce(sum(i.amount_cents) filter(where i.status<>'disputed'),0)/m.budget_cents) end pct_of_budget
 from matters m join business_units b on b.id=m.business_unit_id left join firms f on f.id=m.firm_id left join invoices i on i.matter_id=m.id
 group by m.id,b.name,f.name having m.budget_cents>0 or count(i.id)>0;
create view v_workload as
 select p.ref,p.name,p.kind,
 count(m.id) filter(where m.status='open') open_matters,
 count(m.id) filter(where m.status='open' and m.risk='high') high_risk,
 count(m.id) filter(where m.status='open' and m.next_step_due<current_date) overdue_steps,
 (select count(*) from requests r where r.assigned_to=p.id and r.status='triaged') requests_to_scope
 from people p left join matters m on m.owner_id=p.id where p.kind in ('lawyer','paralegal') and p.active group by p.id;
create view v_cpd as
 select p.ref,p.name,p.jurisdiction,cpd_year_start(current_date) year_from,
 round(coalesce(sum(c.minutes) filter(where c.activity_on>=cpd_year_start(current_date)),0)/60.0,1) hours,
 setting('cpd_hours') required,p.practising_until
 from people p left join cpd c on c.person_id=p.id where p.kind='lawyer' and p.active group by p.id;
create view v_business_units as
 select b.ref,b.name,
 (select count(*) from requests r where r.business_unit_id=b.id and r.received_on>=current_date-90) requests_90d,
 (select count(*) from matters m where m.business_unit_id=b.id and m.status='open') open_matters,
 (select count(*) from matters m where m.business_unit_id=b.id and m.status='open' and m.risk='high') high_risk,
 (select coalesce(sum(i.amount_cents),0) from invoices i join matters m on m.id=i.matter_id where m.business_unit_id=b.id and i.status<>'disputed' and i.invoice_date>=current_date-365) outside_spend_12m_cents,
 (select round(avg(r.triaged_on-r.received_on),1) from requests r where r.business_unit_id=b.id and r.triaged_on is not null) avg_days_to_triage
 from business_units b;
create view v_compliance as
 select p.ref,p.name subject,'PRACTISING-CERTIFICATE' rule,
 case when p.practising_until is null then 'No practising certificate date recorded' when p.practising_until<current_date then 'Practising certificate expired '||p.practising_until else 'Practising certificate expires '||p.practising_until end issue,
 case when p.jurisdiction='NZ' then 'https://www.lawsociety.org.nz/professional-practice/legal-practice/practising-certificates/key-dates-for-lawyers/' else 'Confirm with your state regulator' end source
 from people p where p.kind='lawyer' and p.active and (p.practising_until is null or p.practising_until<current_date+45)
 union all
 select ref,name,'CPD',hours||' of '||required||' CPD hours recorded since '||year_from||', behind pace for the year',
 case when jurisdiction='NZ' then 'https://www.lawsociety.org.nz/professional-practice/continuing-professional-development/cpd-requirements/' else 'Confirm with your state regulator' end
 from v_cpd where hours<round(required*(current_date-year_from)/365.0,1)
 union all
 select matter,matter_name,'LIMITATION','Limitation date '||due_on||' ('||days_left||' days): '||description,'https://www.legislation.govt.nz/act/public/2010/0110/latest/whole.html'
 from v_key_dates where kind='limitation' and not done and days_left<=setting('key_date_window_days')
 union all
 select ref,name,'ENTITY-FILING',case when jurisdiction='NZ' then 'Annual return due by '||next_due else 'Annual review date '||next_due||': fee by the date on the annual statement, solvency resolution within two months' end,
 case when jurisdiction='NZ' then 'https://companies-register.companiesoffice.govt.nz/help-centre/company-annual-returns/completing-an-annual-return/' else 'https://asic.gov.au/for-business-and-companies/companies/company-annual-review' end
 from v_filings where next_due<=current_date+60;
create view v_attention as
 select 1 priority,ref,'Compliance' category,subject||': '||issue detail from v_compliance
 union all select 1,ref,'Key date',matter||' '||kind||' due '||due_on||' ('||days_left||' days): '||description from v_key_dates where not done and days_left<=setting('key_date_window_days')
 union all select 1,ref,'Notice deadline',title||' with '||counterparty||': notice by '||notice_by||(case when renewal_decision='' then ', no renewal decision' else '' end)
  from v_renewals where auto_renews and notice_by between current_date-7 and current_date+setting('renewal_window_days') and renewal_decision not in ('renew','notice given')
 union all select 2,ref,'Untriaged request',title||' from '||business_unit||', '||days_waiting||' days waiting' from v_requests where status='new' and days_waiting>setting('triage_days')
 union all select 2,ref,'Overdue step',name||': '||coalesce(nullif(next_step,''),'(no step)')||' was due '||next_step_due from v_matters where status='open' and next_step_due<current_date
 union all select 2,ref,'No next step',name||' ('||owner||')' from v_matters where status='open' and (next_step='' or next_step_due is null)
 union all select 2,matter,'Budget',firm||' at '||pct_of_budget||'% of budget on '||name from v_spend where pct_of_budget>=setting('budget_alert_pct')
 union all select 2,ref,'Workload',name||' holds '||high_risk||' high-risk matters' from v_workload where high_risk>setting('max_open_high_risk')
 union all select 3,ref,'Quiet matter',name||': last note '||coalesce(last_note_on::text,'never') from v_matters where status='open' and (last_note_on is null or last_note_on<current_date-setting('quiet_days'))
 union all select 3,i.ref,'Disputed invoice',f.name||' '||i.invoice_no||' on '||m.ref from invoices i join firms f on f.id=i.firm_id join matters m on m.id=i.matter_id where i.status='disputed'
 union all select 3,ref,'Panel',name||' panel appointment ends '||panel_until from firms where panel and panel_until<current_date+30;
