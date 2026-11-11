---
description: "Who changed which record and when"
---

# Who changed which record and when

Run `node scripts/legal.mjs audit --json`. Every insert and update is in audit_events with the before and after row.

Start from the command output, never memory. Use record references in the answer.
