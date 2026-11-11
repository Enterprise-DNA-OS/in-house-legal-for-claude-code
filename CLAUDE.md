# In-House Legal for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR COMPANY] legal team
- **Operator:** [YOUR NAME], [general counsel or legal operations lead]
- **What matters most:** no missed date, no surprise renewal, no budget overrun, and the business hearing back fast.

The demo records are fictional.

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Add any record | `/add` |
| Everything that needs a decision now, in priority order | `/attention` |
| Who changed which record and when | `/audit` |
| The legal report for the board or executive | `/board-report` |
| Read one record in full | `/card` |
| Close a matter with its outcome | `/close-matter` |
| Closed matters and their outcomes | `/closed` |
| Check the records against the professional and company rules, with each source cited | `/compliance` |
| The contract register | `/contracts` |
| Turn a request into a matter | `/convert` |
| CPD hours recorded this year for each lawyer | `/cpd` |
| Make this legal team system yours: a field, a stage, a rule | `/customise` |
| Decline a request with the reason recorded | `/decline` |
| Save the board report as a draft page | `/draft-board-report` |
| Draft an instruction letter to the external firm on a matter | `/draft-instruction` |
| Draft a renewal or non-renewal notice for a contract | `/draft-renewal-notice` |
| Save the weekly review as a draft page | `/draft-weekly-review` |
| Export every record to CSV and one JSON snapshot | `/export` |
| Record that a company filing is done | `/filed` |
| Company annual returns and annual reviews due | `/filings` |
| External firms, panel status and agreed rates | `/firms` |
| Bring a matter or contract register across from Xakia | `/import` |
| Everything external counsel needs on a matter | `/instruction` |
| Law firm invoices received | `/invoices` |
| Court, regulator, filing and limitation dates still open | `/key-dates` |
| Add a note to a matter | `/log` |
| Open matters, highest risk first, with next steps and last activity | `/matters` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view` | `/new-view` |
| Recent matter notes | `/notes` |
| Record the renewal decision on a contract | `/renewal` |
| Contracts ending in the next year and their notice deadlines | `/renewals` |
| Every request from the business: new, triaged, declined or turned into a matter | `/requests` |
| Outside counsel spend against budget | `/spend` |
| The legal team, practising certificate dates included | `/team` |
| Triage a new request: assign it to someone on the legal team | `/triage` |
| Legal demand and cost by business unit | `/units` |
| Change fields on a record | `/update` |
| The Monday legal team review, from three commands | `/weekly-review` |
| Who on the legal team is carrying what | `/workload` |

If an ask fits nothing here, run the CLI directly (`node scripts/legal.mjs help`) and then propose a new command for it.

## Hard rules

- Start every answer from `node scripts/legal.mjs <command> --json`. Never from memory.
- Treat every matter as privileged and confidential. Never paste matter details into anything outside this folder without the operator's yes.
- Never calculate a limitation period, notice period or filing date as legal advice. Report the dates recorded and who owns them.
- Drafts (instruction letters, renewal notices, board reports) go to `drafts/` only. A person reviews and sends.

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Xakia.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/xakia
