# In-House Legal for Claude Code

Requests from the business, matters, key dates, contract renewals, company filings, outside counsel budgets and CPD in a database you own. Built by Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free source under MIT. Install and run the demo. | Your business units, matter types, rules and Xakia data mapped across. | Installed, connected and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=xakia) | [Setup fee, then a retainer](https://enterprisedna.co/omni/instead-of/xakia?utm_source=github&utm_medium=readme&utm_campaign=xakia) |

## What this runs

The week of an in-house legal team at a company with a few hundred staff: triaging what the business asks for, turning requests into matters, chasing next steps, watching court, regulator and limitation dates, catching contract notice deadlines before a contract rolls over, filing annual returns for every company in the group, keeping outside counsel inside budget, and reporting legal demand and cost to the board by business unit. It also tracks practising certificate dates and CPD for each lawyer.

[Xakia's pricing page](https://www.xakiatech.com/pricing) lists Advance at US$100, Professional at US$125, Enterprise at US$155 and All-In at US$230 per user per month (checked 11 November 2026). A ten-person legal team on Enterprise is US$18,600 a year at that rate. That is arithmetic from the published price, not a customer invoice.

The free base covers the records and the weekly work. It has no requester portal, document storage, email integration or external counsel portal, which Xakia includes. [What a screen still gives you](docs/why-no-front-end.md).

## Quick start

Requires Node.js 20 or newer. No database install for the demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/in-house-legal-for-claude-code.git
cd in-house-legal-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

Open the folder in your coding agent and type `/attention`. The fictional demo is the legal team of a New Zealand and Australian distributor: a limitation date 48 days out, a regulator response due in six days, two software and payroll contracts past their notice date with no decision, a law firm at 96% of budget, a lawyer whose practising certificate ends in 20 days, two requests past the triage service level and a lease matter that has gone quiet. Dates move with the day you seed.

For your own records, start with an empty `DATA_DIR`, run `npm run migrate` and add your team. Never run the demo seed against business records. To share one database, set `DATABASE_URL` in `.env` to your own Postgres and run `npm run migrate`. Tables have row-level security on with no public policies, so nothing is open to anonymous web clients. The CLI is for trusted members of the legal team.

## The commands

| Command | What it does |
|---|---|
| `/add` | Add any record. |
| `/attention` | Everything that needs a decision now, in priority order. |
| `/audit` | Who changed which record and when. |
| `/board-report` | The legal report for the board or executive. |
| `/card` | Read one record in full. |
| `/close-matter` | Close a matter with its outcome. |
| `/closed` | Closed matters and their outcomes. |
| `/compliance` | Check the records against the professional and company rules, with each source cited. |
| `/contracts` | The contract register. |
| `/convert` | Turn a request into a matter. |
| `/cpd` | CPD hours recorded this year for each lawyer. |
| `/customise` | Make this legal team system yours: a field, a stage, a rule. |
| `/decline` | Decline a request with the reason recorded. |
| `/draft-board-report` | Save the board report as a draft page. |
| `/draft-instruction` | Draft an instruction letter to the external firm on a matter. |
| `/draft-renewal-notice` | Draft a renewal or non-renewal notice for a contract. |
| `/draft-weekly-review` | Save the weekly review as a draft page. |
| `/export` | Export every record to CSV and one JSON snapshot. |
| `/filed` | Record that a company filing is done. |
| `/filings` | Company annual returns and annual reviews due. |
| `/firms` | External firms, panel status and agreed rates. |
| `/import` | Bring a matter or contract register across from Xakia. |
| `/instruction` | Everything external counsel needs on a matter. |
| `/invoices` | Law firm invoices received. |
| `/key-dates` | Court, regulator, filing and limitation dates still open. |
| `/log` | Add a note to a matter. |
| `/matters` | Open matters, highest risk first, with next steps and last activity. |
| `/new-view` | Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. |
| `/notes` | Recent matter notes. |
| `/renewal` | Record the renewal decision on a contract. |
| `/renewals` | Contracts ending in the next year and their notice deadlines. |
| `/requests` | Every request from the business: new, triaged, declined or turned into a matter. |
| `/spend` | Outside counsel spend against budget. |
| `/team` | The legal team, practising certificate dates included. |
| `/triage` | Triage a new request: assign it to someone on the legal team. |
| `/units` | Legal demand and cost by business unit. |
| `/update` | Change fields on a record. |
| `/weekly-review` | The Monday legal team review, from three commands. |
| `/workload` | Who on the legal team is carrying what. |

`npm run view` renders three read-only pages: the legal week, dates that cannot move, and outside counsel spend. `npm run docs` renders a matter status report per open matter, a report per business unit, a renewal review per contract near its notice date, and a register entry per company, in your brand from `brand.json`.

## Ten questions to ask on day one

1. Which business unit sent us the most requests in the last 90 days, and how many days did each wait for triage?
2. Which auto-renewing contracts reach their notice deadline in the next 90 days with no renewal decision recorded?
3. Which open matters have no next step, or a next step already overdue?
4. Which outside firm is at or over 90% of budget, on which matter, excluding disputed invoices?
5. Who on the team is holding more than three high-risk matters?
6. Which limitation dates fall in the next 60 days on matters still open?
7. Which companies in the group have an annual return or annual review due in the next 60 days?
8. Which lawyers are behind pace on CPD hours this year, and whose practising certificate ends first?
9. How much did each business unit cost in outside counsel over the last 12 months?
10. Which panel firm appointments end in the next 30 days?

## Your first hour: ten things to ask for

1. "Add our legal team and their practising certificate dates."
2. "Import our matter register from this spreadsheet." (`/import`, dry run first)
3. "Add every company in the group with its filing month or review date."
4. "Load our contract list and show what reaches its notice date this quarter."
5. "Change the triage service level to one day." (`/customise`)
6. "Add a matter type for whistleblower disclosures."
7. "What does Operations cost us in outside counsel?"
8. "Draft the instruction letter to Harbour Lane on the freight dispute."
9. "Write this month's board report."
10. "Make me a page I can print for Monday's team meeting." (`/new-view`)

## Instead of Xakia

Read [docs/replace-xakia.md](docs/replace-xakia.md). Xakia lists PDF dashboard exports and API access on every plan; save your matter or contract register as CSV and import it with one command, test run first.

## Rules it checks

[docs/compliance.md](docs/compliance.md) lists every check with its source: practising certificate dates, CPD hours (10 a year in New Zealand), recorded limitation dates, New Zealand annual returns and Australian annual reviews. It never calculates a limitation period or gives legal advice.

## Architecture

```
CLAUDE.md, AGENTS.md          how the agent runs this (routing table and rules)
.claude/commands/             one recipe per recurring job
scripts/legal.mjs             the one CLI, --json on every command
scripts/lib/db.mjs            DATABASE_URL (Postgres) or the embedded database
supabase/migrations/          the schema, plain SQL
supabase/seed.sql             the fictional demo
views.json, documents.json    the read-only pages and documents
```

## Want it installed and run for you?

Enterprise DNA installs In-House Legal for Claude Code for your team, maps your Xakia records across, connects it to your inbox and document store, and runs it as part of Omni. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=xakia).

## License

MIT. Copyright (c) 2026 Enterprise DNA. Xakia is a trademark of its owner. This project is not affiliated with or endorsed by Xakia Technologies.
