---
description: "Triage a new request: assign it to someone on the legal team"
---

# Triage a new request: assign it to someone on the legal team

Read the request with `node scripts/legal.mjs card request <ref> --json` first. Ask who should take it if the operator did not say, then run `node scripts/legal.mjs triage <ref> --assign=<person> [--urgency=low|normal|high] [--needed-by=YYYY-MM-DD]`. Then offer `/convert` if it needs real legal work, or `/decline` if the business should handle it.

Start from the command output, never memory. Use record references in the answer.
