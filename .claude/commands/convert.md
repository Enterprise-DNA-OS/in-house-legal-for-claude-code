---
description: "Turn a request into a matter"
---

# Turn a request into a matter

Read the request first. Agree a matter reference (the next M- number from `node scripts/legal.mjs matters --json` and `closed`), the owner, risk, first next step and due date. Run `node scripts/legal.mjs convert <request> --ref=M-123 --owner=<person> --risk=<low|medium|high> --next-step="..." --due=YYYY-MM-DD [--firm=<firm> --budget=<dollars>]`. The request is linked to the matter for the record.

Start from the command output, never memory. Use record references in the answer.
