---
description: "Decline a request with the reason recorded"
---

# Decline a request with the reason recorded

A declined request always carries the reason the business will read. Run `node scripts/legal.mjs decline <ref> --reason="..." [--assign=<person>]`. Offer to draft a short reply to the requester into `drafts/`; never send it.

Start from the command output, never memory. Use record references in the answer.
