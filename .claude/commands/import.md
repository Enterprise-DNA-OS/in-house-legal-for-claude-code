---
description: "Bring a matter or contract register across from Xakia"
---

# Bring a matter or contract register across from Xakia

Read docs/replace-xakia.md. Always run with `--dry-run` first: `node scripts/legal.mjs import xakia --file=<file.csv> [--kind=matters|contracts] [--mapping=map.json] --dry-run --json`. Show the row count, added versus updated, and every warning. Run again without `--dry-run` only when the operator says yes. Owners and firms must exist first; business units are created when new and listed in the warnings.

Start from the command output, never memory. Use record references in the answer.
