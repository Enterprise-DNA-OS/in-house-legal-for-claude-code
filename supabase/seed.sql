-- Fictional demo: the legal team of a 400-person New Zealand and Australian distributor.
-- Dates move with the day you seed. Running the seed again changes nothing.
do $$ declare
 ops uuid; sales uuid; ppl uuid; fin uuid;
 gc uuid; sl uuid; cl uuid; pl uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid;
 f1 uuid; f2 uuid; f3 uuid;
 m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid; m6 uuid; m7 uuid;
begin
if exists(select 1 from business_units where ref='BU-OPS') then return;end if;
if exists(select 1 from business_units) then raise exception 'Demo seed requires an empty database';end if;
insert into business_units(ref,name,leader,cost_centre) values('BU-OPS','Operations','Hemi Walker','CC-210') returning id into ops;
insert into business_units(ref,name,leader,cost_centre) values('BU-SAL','Sales','Grace Tan','CC-310') returning id into sales;
insert into business_units(ref,name,leader,cost_centre) values('BU-PPL','People and Culture','Lena Ruiz','CC-410') returning id into ppl;
insert into business_units(ref,name,leader,cost_centre) values('BU-FIN','Finance','Owen Park','CC-110') returning id into fin;
insert into people(ref,name,kind,email,jurisdiction,practising_until) values('L-01','Ruth Hale','lawyer','ruth.hale@example.com','NZ',make_date(extract(year from current_date+200)::int,6,30)) returning id into gc;
insert into people(ref,name,kind,email,jurisdiction,practising_until) values('L-02','Sam Ito','lawyer','sam.ito@example.com','NSW',current_date+20) returning id into sl;
insert into people(ref,name,kind,email,jurisdiction,practising_until) values('L-03','Claire Ngata','lawyer','claire.ngata@example.com','NZ',make_date(extract(year from current_date+200)::int,6,30)) returning id into cl;
insert into people(ref,name,kind,email,jurisdiction) values('L-04','Pat Cole','paralegal','pat.cole@example.com','NZ') returning id into pl;
insert into people(ref,name,kind,business_unit_id,email) values('R-01','Hemi Walker','requester',ops,'hemi.walker@example.com') returning id into r1;
insert into people(ref,name,kind,business_unit_id,email) values('R-02','Grace Tan','requester',sales,'grace.tan@example.com') returning id into r2;
insert into people(ref,name,kind,business_unit_id,email) values('R-03','Lena Ruiz','requester',ppl,'lena.ruiz@example.com') returning id into r3;
insert into people(ref,name,kind,business_unit_id,email) values('R-04','Grace Fong','requester',sales,'grace.fong@example.com') returning id into r4;
insert into firms(ref,name,panel,contact,email,rate_note,panel_until) values('F-01','Harbour Lane Lawyers',true,'Mia Brooks','mia@example.com','Partner 650, senior associate 420 an hour, NZD',current_date+300) returning id into f1;
insert into firms(ref,name,panel,contact,email,rate_note,panel_until) values('F-02','Southgate Legal',true,'Tom Avery','tom@example.com','Fixed fee for employment advice up to 3,000 NZD',current_date+12) returning id into f2;
insert into firms(ref,name,panel,contact,email,rate_note) values('F-03','Kestrel Partners',false,'Dana Shore','dana@example.com','Engaged once for the Sydney lease, AUD rates') returning id into f3;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on,next_step,next_step_due,firm_id,budget_cents)
 values('M-101','Freight supplier dispute: damaged chilled stock',ops,gc,'dispute','high',current_date-120,'Review counsel draft of the statement of claim',current_date-3,f1,4000000) returning id into m1;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on,next_step,next_step_due,firm_id,budget_cents)
 values('M-102','Personal grievance: warehouse team leader',ppl,cl,'employment','medium',current_date-45,'Prepare for mediation',current_date+9,f2,600000) returning id into m2;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on,next_step,next_step_due)
 values('M-103','Commerce Commission enquiry: promotional pricing',sales,gc,'regulatory','high',current_date-30,'Send the information response',current_date+6) returning id into m3;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on)
 values('M-104','Distribution agreement refresh, Australian retailers',sales,sl,'contract','medium',current_date-60) returning id into m4;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on,next_step,next_step_due,firm_id,budget_cents)
 values('M-105','Sydney warehouse lease renewal',ops,sl,'property','low',current_date-90,'Agree rent review terms with the landlord',current_date+20,f3,1500000) returning id into m5;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,opened_on,next_step,next_step_due)
 values('M-106','Privacy breach: misdirected payroll email',ppl,cl,'privacy','high',current_date-5,'Decide on notification to the Privacy Commissioner',current_date+1) returning id into m6;
insert into matters(ref,name,business_unit_id,owner_id,category,risk,status,opened_on,closed_on,outcome)
 values('M-090','Trade mark filing: new private label range',sales,gc,'ip','low','closed',current_date-200,current_date-40,'Registered in NZ and AU') returning id into m7;
insert into notes(ref,matter_id,body,created_at) values
 ('N-001',m1,'Counsel confirms the claim is within time if filed before the limitation date.',now()-interval '6 days'),
 ('N-002',m2,'Mediation date offered by the employment mediation service.',now()-interval '3 days'),
 ('N-003',m3,'Pricing team supplied promotion history for the last 12 months.',now()-interval '2 days'),
 ('N-004',m5,'Landlord agent proposed a 4 percent fixed review.',now()-interval '40 days'),
 ('N-005',m6,'Recipient confirmed deletion in writing. 38 staff records in the attachment.',now()-interval '1 day');
insert into key_dates(ref,matter_id,kind,due_on,description) values
 ('K-01',m1,'limitation',current_date+48,'Six years from delivery of the damaged consignment'),
 ('K-02',m3,'regulator',current_date+6,'Information response due to the regulator'),
 ('K-03',m2,'other',current_date+9,'Mediation'),
 ('K-04',m5,'other',current_date+75,'Option to renew must be exercised in writing'),
 ('K-05',m1,'court',current_date-10,'Without prejudice meeting');
update key_dates set done=true where ref='K-05';
insert into requests(ref,title,business_unit_id,requester_id,category,urgency,received_on,needed_by,status) values
 ('Q-201','Review new courier terms and conditions',ops,r1,'contract','normal',current_date-6,current_date+7,'new'),
 ('Q-202','Can we run a gift with purchase promotion in Australia?',sales,r2,'advice','high',current_date-1,current_date+3,'new'),
 ('Q-203','Restraint clause for the new sales manager',ppl,r3,'employment','normal',current_date-4,null,'new');
insert into requests(ref,title,business_unit_id,requester_id,category,urgency,received_on,status,assigned_to,triaged_on,matter_id) values
 ('Q-190','Retailer wants changes to the distribution agreement',sales,r4,'contract','normal',current_date-62,'converted',sl,current_date-60,m4),
 ('Q-195','Payroll email sent to the wrong address',ppl,r3,'privacy','high',current_date-5,'converted',cl,current_date-5,m6);
insert into requests(ref,title,business_unit_id,requester_id,category,received_on,status,assigned_to,triaged_on,decision_note) values
 ('Q-198','Approve the wording of a staff newsletter',ppl,r3,'advice',current_date-15,'declined',cl,current_date-13,'Communications team owns newsletter sign-off');
insert into requests(ref,title,business_unit_id,requester_id,category,received_on,status,assigned_to,triaged_on) values
 ('Q-199','NDA for a packaging supplier visit',ops,r1,'contract',current_date-10,'triaged',pl,current_date-9);
insert into contracts(ref,title,counterparty,business_unit_id,owner_id,kind,annual_value_cents,start_on,end_on,auto_renews,notice_days,stored_at) values
 ('C-301','Warehouse management software subscription','Stackline Systems',ops,r1,'licence',8400000,current_date-700,current_date+55,true,60,'Contracts drive/Ops/Stackline'),
 ('C-302','National chilled freight services','Coldway Freight',ops,r1,'supply',52000000,current_date-1000,current_date+150,true,90,'Contracts drive/Ops/Coldway'),
 ('C-303','Retail supply agreement','Northpoint Stores',sales,r2,'customer',120000000,current_date-300,current_date+430,false,0,'Contracts drive/Sales/Northpoint'),
 ('C-304','Payroll bureau services','Ledgerworks Payroll',fin,null,'services',3600000,current_date-365,current_date+25,true,30,'Contracts drive/Finance'),
 ('C-305','Mutual NDA, packaging supplier','Fernpak Packaging',ops,r1,'nda',0,current_date-500,current_date-135,false,0,'Contracts drive/Ops/NDAs');
insert into entities(ref,name,jurisdiction,registration_no,filing_month,last_filed_on,directors) values
 ('E-01','Demo Distribution Limited','NZ','9429000000001',extract(month from current_date+20)::int,current_date-340,'A. Moana; R. Hale'),
 ('E-02','Demo Brands Limited','NZ','9429000000002',extract(month from current_date+150)::int,current_date-200,'A. Moana');
insert into entities(ref,name,jurisdiction,registration_no,review_date,last_filed_on,directors) values
 ('E-03','Demo Distribution Australia Pty Ltd','AU','600 000 001',(current_date-365*3+25),current_date-340,'A. Moana; J. Price');
insert into invoices(ref,matter_id,firm_id,invoice_no,invoice_date,amount_cents,status) values
 ('I-01',m1,f1,'HL-4401',current_date-80,1450000,'paid'),
 ('I-02',m1,f1,'HL-4520',current_date-40,1680000,'approved'),
 ('I-03',m1,f1,'HL-4611',current_date-8,720000,'received'),
 ('I-04',m2,f2,'SG-118',current_date-20,300000,'paid'),
 ('I-05',m5,f3,'KP-2207',current_date-30,480000,'disputed'),
 ('I-06',m7,f1,'HL-4109',current_date-60,210000,'paid');
insert into cpd(ref,person_id,activity_on,activity,minutes) values
 ('D-01',gc,cpd_year_start(current_date)+20,'Law society webinar: competition law update',90),
 ('D-02',gc,cpd_year_start(current_date)+90,'In-house lawyers conference',360),
 ('D-03',gc,cpd_year_start(current_date)+150,'Ethics refresher',120),
 ('D-04',cl,cpd_year_start(current_date)+40,'Employment law seminar',180),
 ('D-05',sl,cpd_year_start(current_date)+60,'Practice management and ethics',60);
end $$;
