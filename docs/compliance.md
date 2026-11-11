# Compliance checks and office policies

Checked 11 November 2026. This is a record-keeping aid for an in-house legal team. It does not give legal advice, calculate a limitation period or decide whether a rule applies. The general counsel decides. `node scripts/legal.mjs compliance --json` returns each flag with its source.

| Check | What the code checks | Basis and limit |
|---|---|---|
| PRACTISING-CERTIFICATE | Each active lawyer has a practising certificate date, and it does not end within 45 days | New Zealand: [NZLS key dates for lawyers](https://www.lawsociety.org.nz/professional-practice/legal-practice/practising-certificates/key-dates-for-lawyers/) states that all current practising certificates expire on 30 June. Australian lawyers: the date you record from your state regulator. The 45-day warning is office policy. |
| CPD | Hours recorded since 1 April are on pace for the yearly minimum in `settings` (`cpd_hours`, 10 by default) | New Zealand: [NZLS CPD requirements](https://www.lawsociety.org.nz/professional-practice/continuing-professional-development/cpd-requirements/) require at least 10 hours of CPD in each full CPD year (1 April to 31 March) for lawyers providing regulated services, plus a plan and declaration. Australian states set their own rules: confirm the minimum and the year with your regulator and change the setting. "On pace" is office policy, not a rule. |
| LIMITATION | Open matters with a recorded limitation date inside the key date window (`key_date_window_days`) | The date is entered by the lawyer who worked it out. The code never calculates one. New Zealand: [Limitation Act 2010](https://www.legislation.govt.nz/act/public/2010/0110/latest/whole.html). Australian matters follow the state or territory Act. |
| ENTITY-FILING | New Zealand companies: an annual return due in the filing month and not yet filed. Australian companies: an annual review date not yet actioned. Flagged 60 days ahead | [Companies Register](https://companies-register.companiesoffice.govt.nz/help-centre/company-annual-returns/completing-an-annual-return/): "your annual returns are due every year during your filing month". [ASIC company annual review](https://asic.gov.au/for-business-and-companies/companies/company-annual-review): the fee is paid by the due date on the annual statement, usually two months after the review date, and directors pass a solvency resolution within two months of the review date unless a financial report was lodged in the past 12 months. |

## Office policies (settings, not law)

| Setting | Default | Used for |
|---|---|---|
| `triage_days` | 2 | Untriaged request flag |
| `quiet_days` | 21 | Open matter with no note |
| `renewal_window_days` | 90 | Contract notice deadlines ahead |
| `key_date_window_days` | 60 | Key dates and limitation dates ahead |
| `budget_alert_pct` | 90 | Outside counsel spend against matter budget |
| `cpd_hours` | 10 | Yearly CPD minimum |
| `max_open_high_risk` | 3 | High-risk matters per lawyer before the workload flag |

Change any of them with `/customise` (one line in a new migration).

## What the database refuses

A matter owned by someone outside the legal team. A request triaged without an assignee, declined without a reason, or converted without a matter. A closed matter without an outcome and close date. Closing a matter that still has open court, regulator, filing or limitation dates. CPD recorded for someone who is not a lawyer. A New Zealand company without a filing month, or an Australian company without a review date. These are data checks, not legal judgements.

Contract notice-by dates are the end date less the notice days recorded. Read the clause itself for how notice must be given and whether business days apply.
