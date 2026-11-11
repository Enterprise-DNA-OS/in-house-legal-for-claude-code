---
description: "Close a matter with its outcome"
---

# Close a matter with its outcome

Read the matter card and its key dates. The database refuses to close a matter with open court, regulator, filing or limitation dates: ask whether each is done and mark it with `node scripts/legal.mjs set date <ref> --done=yes`. Then run `node scripts/legal.mjs close <matter> --outcome="..." [--date=YYYY-MM-DD]`.

Start from the command output, never memory. Use record references in the answer.
