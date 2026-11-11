#!/usr/bin/env node
// The one CLI for In-House Legal for Claude Code. Every slash command is a recipe over this file.
// Human tables by default, --json for machines. Run `node scripts/legal.mjs help`.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick, yesNo } from './lib/csv.mjs';
import { table, money } from './lib/format.mjs';
import { page, table as htmlTable, writeOut } from './lib/render.mjs';

export const entities = {
 unit: {table:'business_units', fields:['ref','name','leader','cost_centre']},
 person: {table:'people', fields:['ref','name','kind','business_unit_id','email','jurisdiction','practising_until','active']},
 firm: {table:'firms', fields:['ref','name','panel','contact','email','rate_note','panel_until']},
 matter: {table:'matters', fields:['ref','name','business_unit_id','owner_id','category','risk','status','opened_on','closed_on','outcome','next_step','next_step_due','firm_id','budget_cents','privileged']},
 request: {table:'requests', fields:['ref','title','business_unit_id','requester_id','category','urgency','received_on','needed_by','status','assigned_to','triaged_on','decision_note','matter_id']},
 date: {table:'key_dates', fields:['ref','matter_id','kind','due_on','description','done']},
 contract: {table:'contracts', fields:['ref','title','counterparty','business_unit_id','owner_id','kind','annual_value_cents','status','start_on','end_on','auto_renews','notice_days','renewal_decision','stored_at','matter_id']},
 entity: {table:'entities', fields:['ref','name','jurisdiction','registration_no','filing_month','review_date','last_filed_on','directors','status']},
 invoice: {table:'invoices', fields:['ref','matter_id','firm_id','invoice_no','invoice_date','amount_cents','status','note']},
 cpd: {table:'cpd', fields:['ref','person_id','activity_on','activity','minutes']},
 note: {table:'notes', fields:['ref','matter_id','body']},
};
const fk = {business_unit_id:'unit',owner_id:'person',requester_id:'person',assigned_to:'person',person_id:'person',firm_id:'firm',matter_id:'matter'};
const alias = {unit:'business_unit_id',owner:'owner_id',requester:'requester_id',assign:'assigned_to',person:'person_id',firm:'firm_id',matter:'matter_id',
 budget:'budget_cents',value:'annual_value_cents',amount:'amount_cents',due:'due_on',hours:'minutes'};
const DATES = ['practising_until','panel_until','opened_on','closed_on','next_step_due','received_on','needed_by','triaged_on','due_on','start_on','end_on','review_date','last_filed_on','invoice_date','activity_on'];
const BOOLS = ['active','panel','privileged','done','auto_renews'];
const NULLABLE = new Set([...DATES,'business_unit_id','requester_id','assigned_to','firm_id','matter_id','owner_id','filing_month']);
const reads = {
 requests:'select ref,title,business_unit,requester,category,urgency,received_on,needed_by,status,assigned_to,matter,days_waiting from v_requests order by status=\'new\' desc,received_on,ref',
 matters:"select ref,name,business_unit,owner,category,risk,next_step,next_step_due,firm,last_note_on from v_matters where status<>'closed' order by case risk when 'high' then 1 when 'medium' then 2 else 3 end,next_step_due nulls first,ref",
 closed:"select ref,name,business_unit,owner,category,opened_on,closed_on,outcome from v_matters m where status='closed' order by ref",
 team:'select ref,name,kind,jurisdiction,practising_until,email from people where kind<>\'requester\' and active order by ref',
 requesters:'select p.ref,p.name,b.name business_unit,p.email from people p left join business_units b on b.id=p.business_unit_id where p.kind=\'requester\' order by p.ref',
 firms:'select ref,name,panel,contact,rate_note,panel_until from firms order by ref',
 units:'select ref,name,requests_90d,open_matters,high_risk,outside_spend_12m_cents,avg_days_to_triage from v_business_units order by ref',
 'key-dates':'select ref,matter,owner,kind,due_on,days_left,description from v_key_dates where not done order by due_on,ref',
 contracts:"select c.ref,c.title,c.counterparty,b.name business_unit,c.kind,c.status,c.end_on,c.auto_renews,c.notice_days,c.annual_value_cents from contracts c join business_units b on b.id=c.business_unit_id order by c.end_on nulls last,c.ref",
 renewals:"select ref,title,counterparty,business_unit,owner,end_on,auto_renews,notice_days,notice_by,annual_value_cents,renewal_decision from v_renewals where end_on between current_date-30 and current_date+365 order by coalesce(notice_by,end_on),ref",
 filings:'select ref,name,jurisdiction,registration_no,next_due,last_filed_on,directors from v_filings order by next_due,ref',
 spend:'select matter,name,business_unit,firm,budget_cents,spent_cents,disputed_cents,pct_of_budget from v_spend order by pct_of_budget desc nulls last,matter',
 invoices:'select i.ref,m.ref matter,f.name firm,i.invoice_no,i.invoice_date,i.amount_cents,i.status from invoices i join matters m on m.id=i.matter_id join firms f on f.id=i.firm_id order by i.invoice_date desc,i.ref',
 workload:'select ref,name,kind,open_matters,high_risk,overdue_steps,requests_to_scope from v_workload order by high_risk desc,open_matters desc,ref',
 cpd:'select ref,name,jurisdiction,year_from,hours,required,practising_until from v_cpd order by hours,ref',
 attention:'select priority,ref,category,detail from v_attention order by priority,category,ref,detail',
 compliance:'select ref,subject,rule,issue,source from v_compliance order by rule,ref',
 notes:'select n.ref,m.ref matter,n.body,n.created_at from notes n join matters m on m.id=n.matter_id order by n.created_at desc,n.ref limit 50',
 audit:'select entity,record_id,action,actor,created_at from audit_events order by created_at desc,id limit 100',
 settings:'select key,value,note from settings order by key',
};
const MONEY_COLS = /_cents$/;
function parse(args){
 const pos=[],opts={};for(const a of args){if(!a.startsWith('--')){pos.push(a);continue;}const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(Object.hasOwn(opts,k))throw Error(`Repeated option --${k}`);opts[k]=i<0?true:a.slice(i+1);}return {pos,opts};
}
const required=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();};
export function dayDate(v){v=String(v).trim();const d=new Date(v+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error(`Invalid calendar date: ${v} (use YYYY-MM-DD)`);return v;}
function integer(v){if(!/^\d+$/.test(String(v).trim()))throw Error(`Expected a whole number: ${v}`);return Number(v);}
export function cents(v){const s=String(v).replace(/[$,\s]/g,'').replace(/^(NZD|AUD|USD)/i,'');if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error(`Expected an amount in dollars: ${v}`);return Math.round(Number(s)*100);}
function bool(v){const s=String(v).trim().toLowerCase();if(['yes','true','y','1'].includes(s))return true;if(['no','false','n','0'].includes(s))return false;throw Error(`Expected yes or no: ${v}`);}
export async function resolve(db,kind,value){
 const e=entities[kind];if(!e)throw Error(`Unknown record type ${kind}. Types: ${Object.keys(entities).join(', ')}`);required(value,kind);
 const name=e.fields.includes('name')?'name':e.fields.includes('title')?'title':'ref';
 let rows=await db.query(`select id,ref,${name} label from ${e.table} where lower(ref)=lower($1) or id::text=lower($1)`,[value]);
 if(!rows.length)rows=await db.query(`select id,ref,${name} label from ${e.table} where starts_with(id::text,lower($1)) or position(lower($1) in lower(${name}))>0 order by ref`,[value]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind} "${value}". Pick one:\n${rows.map(r=>`  ${r.ref}  ${r.label}  ${r.id}`).join('\n')}`:`No ${kind} matches "${value}"`);
 return rows[0].id;
}
async function values(db,kind,opts){
 const e=entities[kind];if(!e)throw Error(`Unknown record type ${kind}`);const vals={};
 for(const [raw,value] of Object.entries(opts)){
 if(raw==='json')continue;const k=alias[raw]||raw.replaceAll('-','_');if(!e.fields.includes(k))throw Error(`Unknown ${kind} field --${raw}. Fields: ${e.fields.join(', ')}`);
 let v=value;if(v===true)throw Error(`--${raw} needs a value`);
 if(v==='null'){if(!NULLABLE.has(k))throw Error(`${k} cannot be cleared`);v=null;}
 else if(fk[k])v=await resolve(db,fk[k],v);
 else if(DATES.includes(k))v=dayDate(v);
 else if(BOOLS.includes(k))v=bool(v);
 else if(MONEY_COLS.test(k))v=cents(v);
 else if(k==='minutes')v=raw==='hours'?Math.round(Number(String(v).trim())*60):integer(v);
 else if(['notice_days','filing_month'].includes(k))v=integer(v);
 else v=required(v,raw);
 if(k==='minutes'&&!(v>0))throw Error('CPD time must be more than zero');
 vals[k]=v;
 }
 if(!Object.keys(vals).length)throw Error('Supply fields as --field=value');return vals;
}
async function write(db,cmd,kind,needle,v){
 const e=entities[kind];const cols=Object.keys(v);
 if(cmd==='add')return db.query(`insert into ${e.table} (${cols.join(',')}) values (${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(v));
 const id=await resolve(db,kind,needle);
 return db.query(`update ${e.table} set ${cols.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${cols.length+1} returning *`,[...Object.values(v),id]);
}
async function tx(db,fn){await db.exec('BEGIN');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function mutate(db,cmd,kind,needle,opts){
 if(!entities[kind])throw Error(`Unknown record type ${kind}. Types: ${Object.keys(entities).join(', ')}`);
 if(cmd==='set')required(needle,kind);
 return tx(db,async()=>write(db,cmd,kind,needle,await values(db,kind,opts)));
}
function allowed(opts,keys){for(const k of Object.keys(opts))if(!['json',...keys].includes(k))throw Error(`Unknown option --${k}`);}
const today=async(db)=>(await db.query('select current_date::text d'))[0].d;

// ------------------------------------------------------------ the team's rituals
async function triage(db,needle,opts){
 allowed(opts,['assign','urgency','needed-by']);
 return tx(db,async()=>{const id=await resolve(db,'request',needle);const r=(await db.query('select status from requests where id=$1',[id]))[0];
 if(r.status!=='new'&&r.status!=='triaged')throw Error(`Request is already ${r.status}`);
 const v=await values(db,'request',{assign:required(opts.assign,'--assign'),...(opts.urgency?{urgency:opts.urgency}:{}),...(opts['needed-by']?{'needed-by':opts['needed-by']}:{})});
 return write(db,'set','request',id,{...v,status:'triaged',triaged_on:await today(db)});});
}
async function decline(db,needle,opts){
 allowed(opts,['reason','assign']);
 return tx(db,async()=>{const id=await resolve(db,'request',needle);const r=(await db.query('select status,assigned_to from requests where id=$1',[id]))[0];
 if(!['new','triaged'].includes(r.status))throw Error(`Request is already ${r.status}`);
 const v=opts.assign?await values(db,'request',{assign:opts.assign}):{};
 return write(db,'set','request',id,{...v,status:'declined',decision_note:required(opts.reason,'--reason'),triaged_on:await today(db)});});
}
async function convert(db,needle,opts){
 allowed(opts,['ref','owner','risk','name','next-step','due','firm','budget']);
 return tx(db,async()=>{
 const id=await resolve(db,'request',needle);const r=(await db.query('select * from requests where id=$1',[id]))[0];
 if(!['new','triaged'].includes(r.status))throw Error(`Request is already ${r.status}`);
 const owner=opts.owner?await resolve(db,'person',opts.owner):r.assigned_to;if(!owner)throw Error('Name the owner with --owner (the request is not assigned)');
 const m={ref:required(opts.ref,'--ref'),name:opts.name?required(opts.name,'--name'):r.title,business_unit_id:r.business_unit_id,owner_id:owner,category:r.category,
  risk:opts.risk||'low',next_step:opts['next-step']||'',next_step_due:opts.due?dayDate(opts.due):null,
  firm_id:opts.firm?await resolve(db,'firm',opts.firm):null,budget_cents:opts.budget?cents(opts.budget):0};
 const matter=(await write(db,'add','matter',null,m))[0];
 await write(db,'set','request',id,{status:'converted',assigned_to:owner,matter_id:matter.id,triaged_on:r.triaged_on||await today(db)});
 return [matter];});
}
async function closeMatter(db,needle,opts){
 allowed(opts,['outcome','date']);
 return tx(db,async()=>{const id=await resolve(db,'matter',needle);
 const open=await db.query('select ref from key_dates where matter_id=$1 and not done and kind in (\'court\',\'regulator\',\'filing\',\'limitation\')',[id]);
 if(open.length)throw Error(`Matter still has open key dates: ${open.map(x=>x.ref).join(', ')}. Mark them done first.`);
 return write(db,'set','matter',id,{status:'closed',outcome:required(opts.outcome,'--outcome'),closed_on:opts.date?dayDate(opts.date):await today(db)});});
}
const DECISIONS=['renew','renegotiate','notice given','let expire'];
async function renewal(db,needle,opts){
 allowed(opts,['decision']);const d=String(opts.decision||'').trim().toLowerCase();
 if(!DECISIONS.includes(d))throw Error(`--decision must be one of: ${DECISIONS.join(', ')}`);
 return mutate(db,'set','contract',needle,{renewal_decision:d});
}
async function filed(db,needle,opts){
 allowed(opts,['date']);return tx(db,async()=>write(db,'set','entity',needle,{last_filed_on:opts.date?dayDate(opts.date):await today(db)}));
}

// ------------------------------------------------------------ import from Xakia
// Xakia documents PDF dashboard exports and API access on every plan; it does not publish a CSV contract.
// The importer reads a matter or contract register saved as CSV (from a Xakia report, the API, or your own spreadsheet).
const MATTER_COLS={ref:['Matter ID','Matter Number','Reference','Ref','ID'],name:['Matter Name','Matter','Title','Name'],unit:['Business Unit','Department','Client','Internal Client'],
 owner:['Owner','Lawyer','Assignee','Assigned To','Responsible Lawyer'],category:['Matter Type','Type','Category','Practice Area'],status:['Status','Stage'],risk:['Risk','Risk Rating','Priority'],
 opened:['Opened','Open Date','Created','Date Opened'],next_step:['Next Step','Next Action'],due:['Next Step Due','Due Date','Due'],firm:['External Firm','Law Firm','Firm'],budget:['Budget','Matter Budget']};
const CONTRACT_COLS={ref:['Contract ID','Reference','Ref','ID'],title:['Contract Name','Contract','Title','Name'],counterparty:['Counterparty','Other Party','Supplier','Customer'],
 unit:['Business Unit','Department','Internal Client'],kind:['Contract Type','Type','Category'],start:['Start Date','Commencement','Effective Date'],end:['End Date','Expiry Date','Expiry','Term End'],
 auto:['Auto Renew','Auto Renewal','Rolls Over'],notice:['Notice Period (days)','Notice Days','Notice Period'],value:['Annual Value','Value','Contract Value'],status:['Status']};
const CATS=['advice','contract','dispute','employment','regulatory','corporate','privacy','property','ip'];
const CAT_WORDS={litigation:'dispute',disputes:'dispute',commercial:'contract',contracts:'contract','general advice':'advice',hr:'employment',people:'employment',compliance:'regulatory',governance:'corporate','intellectual property':'ip','real estate':'property',data:'privacy'};
function mapCategory(s){s=String(s||'').trim().toLowerCase();if(!s)return 'advice';if(CATS.includes(s))return s;if(CAT_WORDS[s])return CAT_WORDS[s];throw Error(`Unknown matter type "${s}". Map it with --mapping or add a word to CAT_WORDS.`);}
function mapStatus(s){s=String(s||'').trim().toLowerCase();if(!s||['open','active','in progress','new'].includes(s))return 'open';if(['on hold','paused','waiting'].includes(s))return 'on_hold';if(['closed','complete','completed','resolved'].includes(s))return 'closed';throw Error(`Unknown status "${s}"`);}
function mapRisk(s){s=String(s||'').trim().toLowerCase();if(!s)return 'low';if(['low','medium','high'].includes(s))return s;if(['critical','urgent'].includes(s))return 'high';if(s==='moderate')return 'medium';throw Error(`Unknown risk "${s}"`);}
const CONTRACT_KINDS=['supply','customer','services','licence','lease','nda','employment','other'];
function mapKind(s){s=String(s||'').trim().toLowerCase();if(!s)return 'other';if(CONTRACT_KINDS.includes(s))return s;const m={license:'licence',software:'licence',saas:'licence','non-disclosure':'nda',confidentiality:'nda',supplier:'supply',vendor:'supply',sales:'customer',property:'lease'};return m[s]||'other';}
function flexDate(v,label){v=String(v||'').trim();if(!v)return null;const m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return dayDate(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);try{return dayDate(v.slice(0,10));}catch{throw Error(`${label}: unreadable date "${v}" (use YYYY-MM-DD or DD/MM/YYYY)`);}}
async function unitFor(db,name,created){
 const n=required(name,'business unit');const rows=await db.query('select id from business_units where lower(name)=lower($1) or lower(ref)=lower($1)',[n]);if(rows.length)return rows[0].id;
 const ref='BU-'+n.toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,12);const r=await db.query('insert into business_units(ref,name) values($1,$2) on conflict(ref) do update set name=business_units.name returning id',[ref,n]);created.add(n);return r[0].id;
}
async function importXakia(db,opts){
 allowed(opts,['file','kind','mapping','dry-run']);const kind=opts.kind||'matters';if(!['matters','contracts'].includes(kind))throw Error('--kind must be matters or contracts');
 const rows=parseCsv(fs.readFileSync(required(opts.file,'--file'),'utf8'));if(!rows.length)throw Error('CSV has no data rows');
 const cols=kind==='matters'?MATTER_COLS:CONTRACT_COLS;const mapping=opts.mapping?JSON.parse(fs.readFileSync(opts.mapping,'utf8')):{};
 if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Mapping must be a JSON object');
 for(const [k,v] of Object.entries(mapping))if(!cols[k]||typeof v!=='string'||!Object.keys(rows[0]).includes(v))throw Error(`Mapping "${k}" must name a column in this file`);
 const val=(r,k)=>mapping[k]?r[mapping[k]]:pick(r,...cols[k]);
 const out=[],created=new Set(),warnings=[];
 await db.exec('BEGIN');try{
 for(const [i,r] of rows.entries()){try{
  const ref=required(val(r,'ref'),'reference');
  if(kind==='matters'){
   const owner=await resolve(db,'person',required(val(r,'owner'),'owner'));
   const status=mapStatus(val(r,'status'));const firm=val(r,'firm')?await resolve(db,'firm',val(r,'firm')):null;
   const vals=[ref,required(val(r,'name'),'matter name'),await unitFor(db,val(r,'unit'),created),owner,mapCategory(val(r,'category')),mapRisk(val(r,'risk')),
    status==='closed'?'on_hold':status,flexDate(val(r,'opened'),'opened')||await today(db),val(r,'next_step')||'',flexDate(val(r,'due'),'due'),firm,val(r,'budget')?cents(val(r,'budget')):0,JSON.stringify(r)];
   const res=await db.query(`insert into matters(ref,name,business_unit_id,owner_id,category,risk,status,opened_on,next_step,next_step_due,firm_id,budget_cents) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    on conflict(ref) do update set name=excluded.name,business_unit_id=excluded.business_unit_id,owner_id=excluded.owner_id,category=excluded.category,risk=excluded.risk,
    next_step=excluded.next_step,next_step_due=excluded.next_step_due,firm_id=excluded.firm_id,budget_cents=excluded.budget_cents returning ref,(xmax=0) inserted`,vals.slice(0,12));
   if(status==='closed')warnings.push(`${ref}: closed in the source. Imported on hold; close it with an outcome: close ${ref} --outcome="..."`);
   out.push({row:i+2,ref:res[0].ref,action:res[0].inserted?'added':'updated'});
  }else{
   const auto=yesNo(val(r,'auto'));const notice=val(r,'notice')?integer(String(val(r,'notice')).replace(/\s*days?$/i,'')):0;
   const st=String(val(r,'status')||'signed').trim().toLowerCase();const status=['draft','under_review','signed','expired','terminated'].includes(st.replace(' ','_'))?st.replace(' ','_'):(['active','executed','current'].includes(st)?'signed':null);
   if(!status)throw Error(`Unknown contract status "${st}"`);
   const vals=[ref,required(val(r,'title'),'contract name'),required(val(r,'counterparty'),'counterparty'),await unitFor(db,val(r,'unit'),created),mapKind(val(r,'kind')),
    flexDate(val(r,'start'),'start'),flexDate(val(r,'end'),'end'),auto,notice,val(r,'value')?cents(val(r,'value')):0,status];
   if(auto&&!vals[6])throw Error('Auto-renewing contract has no end date');
   const res=await db.query(`insert into contracts(ref,title,counterparty,business_unit_id,kind,start_on,end_on,auto_renews,notice_days,annual_value_cents,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    on conflict(ref) do update set title=excluded.title,counterparty=excluded.counterparty,business_unit_id=excluded.business_unit_id,kind=excluded.kind,start_on=excluded.start_on,end_on=excluded.end_on,
    auto_renews=excluded.auto_renews,notice_days=excluded.notice_days,annual_value_cents=excluded.annual_value_cents,status=excluded.status returning ref,(xmax=0) inserted`,vals);
   out.push({row:i+2,ref:res[0].ref,action:res[0].inserted?'added':'updated'});
  }
 }catch(e){throw Error(`CSV row ${i+2}: ${e.message}`);}}
 if(created.size)warnings.push(`New business units: ${[...created].join(', ')}`);
 await db.exec(opts['dry-run']?'ROLLBACK':'COMMIT');return {dry_run:Boolean(opts['dry-run']),kind,rows:out.length,warnings,records:out};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
async function exportAll(db,opts){
 allowed(opts,['out']);const dir=path.resolve(opts.out||path.join(REPO_ROOT,'exports',new Date().toISOString().replace(/[:.]/g,'-')));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});const snapshot={format:'in-house-legal-v1',exported_at:new Date().toISOString(),tables:{}};
 await db.exec('BEGIN READ ONLY');try{
 for(const t of [...Object.values(entities).map(e=>e.table),'settings','audit_events']){
  const rows=await db.query(`select * from ${t} order by ${t==='settings'?'key':'id'}`);snapshot.tables[t]=rows;
  if(rows.length){const keys=Object.keys(rows[0]);const data=[keys.map(csvCell).join(','),...rows.map(r=>keys.map(k=>csvCell(typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n')+'\r\n';fs.writeFileSync(path.join(dir,t+'.csv'),data,{mode:0o600,flag:'wx'});}
 }
 fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify(snapshot,null,2)+'\n',{mode:0o600,flag:'wx'});
 await db.exec('ROLLBACK');return {directory:dir,counts:Object.fromEntries(Object.entries(snapshot.tables).map(([k,v])=>[k,v.length]))};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}

// ------------------------------------------------------------ reviews and drafts
async function weeklyReview(db){return {attention:await db.query(reads.attention),requests:await db.query("select ref,title,business_unit,urgency,days_waiting,status from v_requests where status in ('new','triaged') order by days_waiting desc"),workload:await db.query(reads.workload)};}
async function boardReport(db){
 return {business_units:await db.query(reads.units),
  high_risk:await db.query("select ref,name,business_unit,owner,category,next_step,next_step_due from v_matters where status='open' and risk='high' order by ref"),
  key_dates:await db.query("select ref,matter,kind,due_on,description from v_key_dates where not done and days_left<=90 order by due_on"),
  spend:await db.query(reads.spend),
  compliance:await db.query('select ref,subject,rule,issue from v_compliance order by rule,ref')};
}
async function instruction(db,needle){
 const id=await resolve(db,'matter',needle);
 const m=(await db.query('select m.ref,m.name,b.name business_unit,o.name owner,o.email owner_email,m.category,m.risk,m.next_step,m.next_step_due,m.budget_cents,m.privileged,f.name firm,f.contact,f.email firm_email,f.rate_note from matters m join business_units b on b.id=m.business_unit_id join people o on o.id=m.owner_id left join firms f on f.id=m.firm_id where m.id=$1',[id]))[0];
 if(!m.firm)throw Error(`${m.ref} has no external firm. Set one: set matter ${m.ref} --firm=<firm>`);
 const spent=(await db.query("select coalesce(sum(amount_cents),0) c from invoices where matter_id=$1 and status<>'disputed'",[id]))[0].c;
 return {matter:m,spent_cents:spent,key_dates:await db.query('select kind,due_on,description from key_dates where matter_id=$1 and not done order by due_on',[id]),
  history:await db.query('select created_at::date on_date,body from notes where matter_id=$1 order by created_at',[id])};
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draft(name,title,subtitle,sections){return {file:writeOut('drafts',`${name}-${Date.now()}`,page({title,subtitle,sections}))};}
function rowsHtml(obj){return Object.entries(obj).map(([k,v])=>({title:k.replaceAll('_',' '),html:htmlTable(Array.isArray(v)?v:[v])}));}

const usage=`In-House Legal CLI

Reads: ${Object.keys(reads).join(', ')}
card <type> <ref-or-name>
add <type> --ref=... --field=value     set <type> <ref-or-name> --field=value
Types: ${Object.keys(entities).join(', ')}
triage <request> --assign=<person> [--urgency=] [--needed-by=]
decline <request> --reason="..."
convert <request> --ref=M-123 [--owner=] [--risk=] [--next-step=] [--due=] [--firm=] [--budget=]
close <matter> --outcome="..." [--date=]
log <matter> --text="..."
renewal <contract> --decision="renew|renegotiate|notice given|let expire"
filed <entity> [--date=]
weekly-review | board-report | instruction <matter>
draft-weekly-review | draft-board-report | draft-instruction <matter> | draft-renewal-notice <contract>
import xakia --file=register.csv [--kind=matters|contracts] [--mapping=map.json] [--dry-run]
export [--out=folder]
Every command accepts --json. Dates YYYY-MM-DD. Money in dollars (--budget=40000).`;
export async function execute(db,args){
 const {pos,opts}=parse(args);const [cmd,kind,needle]=pos;
 if(cmd==='help'||!cmd)return {help:usage};
 if(reads[cmd]){allowed(opts,[]);if(pos.length>1)throw Error('Read commands take no filters. Ask Claude to filter the result.');return db.query(reads[cmd]);}
 if(cmd==='add'||cmd==='set')return mutate(db,cmd,kind,needle,opts);
 if(cmd==='card'){allowed(opts,[]);const id=await resolve(db,kind,needle);return db.query(`select * from ${entities[kind].table} where id=$1`,[id]);}
 if(cmd==='triage')return triage(db,kind,opts);
 if(cmd==='decline')return decline(db,kind,opts);
 if(cmd==='convert')return convert(db,kind,opts);
 if(cmd==='close')return closeMatter(db,kind,opts);
 if(cmd==='renewal')return renewal(db,kind,opts);
 if(cmd==='filed')return filed(db,kind,opts);
 if(cmd==='log'){allowed(opts,['text']);return mutate(db,'add','note',null,{ref:'N-'+crypto.randomUUID().slice(0,13),matter:required(kind,'matter'),body:required(opts.text,'--text')});}
 if(cmd==='import'){if(kind!=='xakia')throw Error('Supported import: xakia (a matter or contract register saved as CSV)');return importXakia(db,opts);}
 if(cmd==='export')return exportAll(db,opts);
 if(cmd==='weekly-review'){allowed(opts,[]);return weeklyReview(db);}
 if(cmd==='draft-weekly-review'){allowed(opts,[]);return draft('weekly-review','DRAFT weekly legal review','Read before the Monday team meeting. Nothing sent.',rowsHtml(await weeklyReview(db)));}
 if(cmd==='board-report'){allowed(opts,[]);return boardReport(db);}
 if(cmd==='draft-board-report'){allowed(opts,[]);return draft('board-report','DRAFT legal report to the board','General counsel review required before circulation. Privileged and confidential.',rowsHtml(await boardReport(db)));}
 if(cmd==='instruction'){allowed(opts,[]);return instruction(db,kind);}
 if(cmd==='draft-instruction'){allowed(opts,[]);const x=await instruction(db,kind);const m=x.matter;
  const letter=`<p>To ${esc(m.contact||m.firm)}, ${esc(m.firm)}</p><p>We instruct you on <strong>${esc(m.name)}</strong> (our reference ${esc(m.ref)}), for our ${esc(m.business_unit)} team. ${m.privileged?'This instruction and your advice are privileged and confidential.':''}</p>
<p>Next step we need: ${esc(m.next_step||'to be agreed')}${m.next_step_due?`, by ${esc(m.next_step_due)}`:''}.</p><p>Budget: ${m.budget_cents?esc(money(m.budget_cents)):'not set'}; invoiced so far ${esc(money(x.spent_cents))}. Tell us before work will pass the budget. Agreed rates: ${esc(m.rate_note||'as per panel terms')}.</p>
<p>Your contact here is ${esc(m.owner)} (${esc(m.owner_email)}).</p>`;
  return draft(`instruction-${m.ref}`,'DRAFT instruction to external counsel',`${m.ref}. Review before sending. Nothing sent.`,[{title:'Letter',html:letter},{title:'Key dates',html:htmlTable(x.key_dates)},{title:'History',html:htmlTable(x.history)}]);}
 if(cmd==='draft-renewal-notice'){allowed(opts,[]);const id=await resolve(db,'contract',kind);
  const c=(await db.query('select r.*,c.renewal_decision decision from v_renewals r join contracts c on c.id=r.id where r.id=$1',[id]))[0];if(!c)throw Error('Only signed contracts with an end date have a renewal notice');
  const html=`<p>To ${esc(c.counterparty)}</p><p>Re: ${esc(c.title)} (our reference ${esc(c.ref)}), ending ${esc(c.end_on)}.</p><p>${c.decision==='notice given'||c.decision==='let expire'?'We give notice that we will not renew this agreement when the current term ends.':'We give notice that we wish to discuss terms before this agreement renews.'}</p><p>Please confirm receipt.</p>`;
  return draft(`renewal-notice-${c.ref}`,'DRAFT renewal notice',`Notice by ${c.notice_by??'n/a'}. Check the notice clause and method of service before sending. Nothing sent.`,[{title:'Notice',html},{title:'Contract',html:htmlTable([c])}]);}
 throw Error(`Unknown command ${cmd}. Run help.`);
}
function fmt(rows){return rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k.replace(/_cents$/,''),MONEY_COLS.test(k)?money(v):v instanceof Date?v.toISOString().slice(0,16).replace('T',' '):v])));}
function human(result){if(Array.isArray(result)){if(!result.length)return '(none)';const rows=fmt(result);return table(rows,Object.keys(rows[0]).filter(k=>k!=='id'&&k!=='source_row').map(key=>({key,label:key.replaceAll('_',' '),width:60})));}if(result.help)return result.help;
 return Object.entries(result).map(([k,v])=>`${k.replaceAll('_',' ')}\n${Array.isArray(v)?human(v):v&&typeof v==='object'?human([v]):v}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const args=process.argv.slice(2);db=await getDb();const result=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
