# Move off Xakia

Checked 11 November 2026. Xakia's [pricing page](https://www.xakiatech.com/pricing) lists dashboard downloads to PDF, automatic report delivery and API access on every plan. Its public pages do not document a bulk CSV export of matters or contracts. So the import here reads a **register saved as CSV**: a matter list or contract list from a Xakia report, an API pull, or the spreadsheet your team already keeps beside it. The example files in the tests are made up. Check your own headers and map them.

## Before you start

1. Add the legal team: `node scripts/legal.mjs add person --ref=L-01 --name="..." --kind=lawyer --jurisdiction=NZ --practising-until=YYYY-MM-DD`.
2. Add your external firms: `node scripts/legal.mjs add firm --ref=F-01 --name="..." --panel=yes`.
3. Business units are created from the register when they are new, and listed in the warnings.

## Matters

Columns read by default (first match wins, case does not matter):

| Field | Column names tried |
|---|---|
| ref | Matter ID, Matter Number, Reference, Ref, ID |
| name | Matter Name, Matter, Title, Name |
| unit | Business Unit, Department, Client, Internal Client |
| owner | Owner, Lawyer, Assignee, Assigned To, Responsible Lawyer |
| category | Matter Type, Type, Category, Practice Area |
| status | Status, Stage |
| risk | Risk, Risk Rating, Priority |
| opened | Opened, Open Date, Created, Date Opened |
| next_step / due | Next Step, Next Action / Next Step Due, Due Date, Due |
| firm / budget | External Firm, Law Firm, Firm / Budget, Matter Budget |

```bash
node scripts/legal.mjs import xakia --file=imports/matters.csv --dry-run --json
node scripts/legal.mjs import xakia --file=imports/matters.csv
```

When your headers differ, write a mapping and pass `--mapping=imports/map.json`:

```json
{"ref":"Matter No.","name":"Description","unit":"Requesting Team","owner":"Lead Lawyer"}
```

Matter types map to advice, contract, dispute, employment, regulatory, corporate, privacy, property or ip (litigation becomes dispute, commercial becomes contract, governance becomes corporate). An unknown type stops the import and names the row. Closed matters come in on hold with a warning, because a closed matter here needs an outcome: close each one with `close <ref> --outcome="..."`. Dates read as YYYY-MM-DD or DD/MM/YYYY.

## Contracts

```bash
node scripts/legal.mjs import xakia --kind=contracts --file=imports/contracts.csv --dry-run --json
```

Reads Contract ID, Contract Name, Counterparty, Business Unit, Contract Type, Start Date, End Date (or Expiry Date), Auto Renew, Notice Period (days), Annual Value and Status. An auto-renewing contract with no end date stops the import.

## How the import behaves

Every row is checked inside one transaction. One bad row (an owner nobody has added, an unreadable date) rolls back the whole file, audit entries included, and names the CSV row. A dry run rolls back everything. Running the same file again updates the same references instead of adding duplicates.

## What does not come across

Documents and email threads stay where they are; record where each contract is stored in `stored_at`. Invoice history, CPD, key dates and company records are added with `add` or a mapped CSV through `/customise`. Xakia user accounts, permissions, intake forms, workflows and paid add-ons have no equivalent here. Enterprise DNA maps the rest as part of a custom version.

## Your records back out

`node scripts/legal.mjs export --out=exports/review-1` writes one CSV per record type and `snapshot.json` with every table and the audit trail. It never overwrites an existing export. Use your database's own backups for disaster recovery.
