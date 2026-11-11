// npm test: a scratch database, migrate, seed, every command, assertions, PASS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { execute } from './legal.mjs';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'in-house-legal-test-'));
process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(scratch,'db');process.env.OUTPUT_DIR=path.join(scratch,'output');
const db=await getDb();let checks=0,dbClosed=false;
const test=async(name,fn)=>{await fn();checks++;console.log('ok '+checks+' '+name);};
const run=(...args)=>execute(db,args);
const bad=async(args,re)=>assert.rejects(()=>run(...args),re);
const rows=(sql)=>db.query(sql);
const fixture=(name,text)=>{const p=path.join(scratch,name);fs.writeFileSync(p,text);return p;};
const READS=['requests','matters','closed','team','requesters','firms','units','key-dates','contracts','renewals','filings','spend','invoices','workload','cpd','attention','compliance','notes','audit','settings'];
try{
 await test('migrations and seed are repeatable',async()=>{assert.equal((await migrate(db)).ran.length,1);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);assert.equal((await run('matters')).length,6);assert.equal((await run('team')).length,4);});
 const day=async(n)=>(await rows(`select (current_date+${n})::text d`))[0].d;
 await test('every read command returns records',async()=>{for(const r of READS)assert(Array.isArray(await run(r)),r);assert.match((await run('help')).help,/convert <request>/);});
 await test('the demo raises every kind of attention item',async()=>{const a=await run('attention');for(const c of ['Compliance','Key date','Notice deadline','Untriaged request','Overdue step','No next step','Budget','Quiet matter','Disputed invoice','Panel'])assert(a.some(x=>x.category===c),c);
  const comp=await run('compliance');for(const r of ['PRACTISING-CERTIFICATE','CPD','LIMITATION','ENTITY-FILING'])assert(comp.some(x=>x.rule===r),r);assert(comp.every(x=>x.source));});
 await test('spend, workload, filings and units add up',async()=>{const s=(await run('spend')).find(x=>x.matter==='M-101');assert.equal(Number(s.spent_cents),3850000);assert.equal(Number(s.pct_of_budget),96);
  const k=(await run('spend')).find(x=>x.matter==='M-105');assert.equal(Number(k.disputed_cents),480000);assert.equal(Number(k.spent_cents),0);
  assert.equal((await run('workload')).find(x=>x.ref==='L-01').high_risk,2);assert.equal((await run('filings')).length,3);
  assert.equal(Number((await run('units')).find(x=>x.ref==='BU-OPS').outside_spend_12m_cents),3850000);});
 await test('names resolve case-insensitively and by id prefix; ambiguity lists candidates',async()=>{assert.equal((await run('card','person','ruth'))[0].ref,'L-01');const m=(await run('card','matter','M-101'))[0];assert.equal((await run('card','matter',m.id.slice(0,8)))[0].ref,'M-101');
  await bad(['card','person','Grace'],/Ambiguous[\s\S]*R-02[\s\S]*R-04/);await bad(['card','person','nobody'],/No person/);});
 await test('request lifecycle: triage, convert, decline, with the rules enforced',async()=>{
  await bad(['triage','Q-201','--assign=Hemi'],/legal team/);
  await run('triage','Q-201','--assign=Pat Cole');assert.equal((await run('card','request','Q-201'))[0].status,'triaged');
  const [m]=await run('convert','Q-201','--ref=M-201','--owner=L-03','--risk=medium','--next-step=Mark up the courier terms','--due='+(await day(5)),'--budget=2500');
  assert.equal(m.ref,'M-201');assert.equal(Number(m.budget_cents),250000);const r=(await run('card','request','Q-201'))[0];assert.equal(r.status,'converted');assert.equal(r.matter_id,m.id);
  await bad(['convert','Q-201','--ref=M-202'],/already converted/);
  await bad(['decline','Q-203'],/--reason is required/);await run('decline','Q-203','--reason=People team uses the standard restraint template','--assign=L-03');
  assert.equal((await run('card','request','Q-203'))[0].status,'declined');
  await bad(['add','matter','--ref=M-X','--name=Bad owner','--unit=BU-OPS','--owner=Hemi Walker'],/legal team/);});
 await test('matters: log, key dates, close only when dates are done',async()=>{
  await run('log','M-104','--text=Retailer sent its mark-up.');assert(!(await run('attention')).some(x=>x.category==='Quiet matter'&&x.ref==='M-104'));
  await run('set','matter','M-104','--next-step=Reply to the retailer mark-up','--next-step-due='+(await day(4)));assert(!(await run('attention')).some(x=>x.category==='No next step'&&x.ref==='M-104'));
  await bad(['close','M-101','--outcome=Settled'],/open key dates: K-01/);
  await run('add','date','--ref=K-X','--matter=M-102','--kind=court','--due='+(await day(30)),'--description=Authority hearing');
  await bad(['close','M-102','--outcome=Settled'],/K-X/);await run('set','date','K-X','--done=yes');
  await bad(['close','M-102'],/--outcome is required/);await run('close','M-102','--outcome=Settled at mediation');
  assert.equal((await run('card','matter','M-102'))[0].status,'closed');assert((await run('closed')).some(x=>x.ref==='M-102'));
  await bad(['set','matter','M-103','--status=closed'],/check constraint/);});
 await test('contracts: renewal decisions clear the notice flag',async()=>{assert((await run('attention')).some(x=>x.ref==='C-304'));
  await bad(['renewal','C-304','--decision=maybe'],/must be one of/);await run('renewal','C-304','--decision=notice given');assert(!(await run('attention')).some(x=>x.ref==='C-304'));});
 await test('filings, CPD and practising certificates update the compliance check',async()=>{
  await bad(['filed','E-03','--date=2026-13-01'],/Invalid calendar date/);const due=(await run('filings')).find(x=>x.ref==='E-03').next_due;await run('filed','E-03','--date='+due);assert(!(await run('compliance')).some(x=>x.ref==='E-03'));
  const nz=(await run('filings')).find(x=>x.ref==='E-01').next_due;await run('filed','E-01','--date='+nz);assert(!(await run('compliance')).some(x=>x.ref==='E-01'));
  await run('add','cpd','--ref=D-X','--person=L-03','--activity_on='+(await day(0)),'--activity=Privacy law update','--hours=6');
  assert(!(await run('compliance')).some(x=>x.ref==='L-03'&&x.rule==='CPD'));
  await bad(['add','cpd','--ref=D-Y','--person=R-01','--activity_on='+(await day(0)),'--activity=x','--hours=1'],/lawyers/);
  await run('set','person','L-02','--practising-until='+(await day(230)));assert(!(await run('compliance')).some(x=>x.ref==='L-02'&&x.rule==='PRACTISING-CERTIFICATE'));});
 await test('input validation: dates, money, unknown fields, booleans',async()=>{
  await bad(['set','matter','M-103','--next-step-due=2026-02-30'],/Invalid calendar date/);await bad(['set','matter','M-103','--budget=lots'],/amount in dollars/);
  await bad(['set','matter','M-103','--colour=red'],/Unknown matter field/);await bad(['set','contract','C-302','--auto-renews=perhaps'],/yes or no/);
  await run('set','matter','M-103','--budget=$12,500.50');assert.equal(Number((await run('card','matter','M-103'))[0].budget_cents),1250050);
  assert((await rows("select * from audit_events where entity='matters' and action='UPDATE'")).length>0);});
 await test('Xakia matter register import: dry run, repeat, mapping, roll back on a bad row',async()=>{
  const f=fixture('matters.csv','﻿Matter ID,Matter Name,Business Unit,Owner,Matter Type,Status,Risk,Opened,Next Step,Due Date,External Firm,Budget\r\nX-1,"Supplier claim, damaged pallets",Operations,Ruth Hale,Litigation,Open,High,12/03/2026,Instruct counsel,'+(await day(10))+',Harbour Lane,"$20,000"\r\nX-2,Board minutes template,Legal Ops,Sam Ito,Governance,Closed,Low,2026-01-15,,,,\r\n');
  const dry=await run('import','xakia','--file='+f,'--dry-run');assert.equal(dry.rows,2);assert.equal((await rows("select * from matters where ref like 'X-%'")).length,0);
  const res=await run('import','xakia','--file='+f);assert(res.warnings.some(w=>/X-2: closed/.test(w)));assert(res.warnings.some(w=>/Legal Ops/.test(w)));
  const again=await run('import','xakia','--file='+f);assert(again.records.every(r=>r.action==='updated'));assert.equal((await rows("select * from matters where ref like 'X-%'")).length,2);
  const x1=(await run('card','matter','X-1'))[0];assert.equal(x1.category,'dispute');assert.equal(x1.opened_on,'2026-03-12');assert.equal(Number(x1.budget_cents),2000000);
  const f2=fixture('mapped.csv','Ref,Title,Team,Lawyer\nX-3,Lease query,Operations,Claire Ngata\n');const map=fixture('map.json',JSON.stringify({ref:'Ref',name:'Title',unit:'Team',owner:'Lawyer'}));
  await run('import','xakia','--file='+f2,'--mapping='+map);assert.equal((await run('card','matter','X-3'))[0].category,'advice');
  const n=(await rows('select count(*)::int n from audit_events'))[0].n;
  const broken=fixture('broken.csv','Matter ID,Matter Name,Business Unit,Owner\nX-4,Fine,Operations,Ruth Hale\nX-5,Bad,Operations,Nobody Here\n');
  await bad(['import','xakia','--file='+broken],/CSV row 3: No person/);assert.equal((await rows("select * from matters where ref='X-4'")).length,0);assert.equal((await rows('select count(*)::int n from audit_events'))[0].n,n);});
 await test('Xakia contract register import',async()=>{
  const f=fixture('contracts.csv','Contract ID,Contract Name,Counterparty,Business Unit,Contract Type,Start Date,End Date,Auto Renew,Notice Period (days),Annual Value,Status\nCX-1,Cleaning services,Shine Co,Operations,Services,2025-01-01,'+(await day(100))+',Yes,60 days,"18,000",Active\n');
  await run('import','xakia','--kind=contracts','--file='+f);const c=(await run('card','contract','CX-1'))[0];assert.equal(c.auto_renews,true);assert.equal(c.notice_days,60);assert.equal(c.status,'signed');
  assert((await run('attention')).some(x=>x.ref==='CX-1'&&x.category==='Notice deadline'));});
 await test('reviews and drafts hold the real records; export never overwrites',async()=>{
  const w=await run('weekly-review');assert.deepEqual(w.attention,await run('attention'));assert.deepEqual(w.workload,await run('workload'));
  const b=await run('board-report');assert(b.high_risk.some(x=>x.ref==='M-101'));
  for(const cmd of [['draft-weekly-review'],['draft-board-report'],['draft-instruction','M-101'],['draft-renewal-notice','C-301']]){const out=await run(...cmd);const html=fs.readFileSync(out.file,'utf8');assert(html.includes('DRAFT'),cmd[0]);}
  assert(fs.readFileSync((await run('draft-instruction','M-101')).file,'utf8').includes('Harbour Lane Lawyers'));
  await bad(['draft-instruction','M-103'],/no external firm/);
  const dir=path.join(scratch,'export');const e=await run('export','--out='+dir);assert(e.counts.matters>=9);assert(fs.existsSync(path.join(dir,'matters.csv')));await bad(['export','--out='+dir],/EEXIST/);});
 await test('HTML escapes user data',async()=>{await run('set','matter','M-101','--name=<script>alert(1)</script>');const html=fs.readFileSync((await run('draft-instruction','M-101')).file,'utf8');assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>alert'));});
 await db.close();dbClosed=true;
 await test('the CLI exits 1 and lists candidates when a name is ambiguous',async()=>{const p=spawnSync(process.execPath,['scripts/legal.mjs','card','person','Grace','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,1);assert.match(p.stderr,/R-02[\s\S]*R-04/);});
 await test('dashboards and documents render from the same data',async()=>{for(const name of ['view','docs']){const p=spawnSync(process.execPath,[`scripts/${name}.mjs`],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
  for(const v of ['week','dates','spend'])assert(fs.existsSync(path.join(process.env.OUTPUT_DIR,'views',v+'.html')),v);
  for(const d of ['matter-status','business-unit-report','renewal-review','entity-register'])assert(fs.readdirSync(path.join(process.env.OUTPUT_DIR,'docs-out',d)).length>0,d);});
 console.log(`PASS: ${checks} end-to-end checks on an isolated embedded database; every CLI command exercised.`);
}finally{if(!dbClosed)await db.close();fs.rmSync(scratch,{recursive:true,force:true});}
