---
description: "Make this legal team system yours: a field, a stage, a rule"
---

# Make it yours

Read CLAUDE.md, the migration, scripts/legal.mjs and docs/compliance.md, then the operator's change in plain words. Examples: add a "privilege reviewed by" field to matters, rename the risk levels, change the triage service level, add a business unit, add an Australian state's CPD rule.

1. Write the next numbered migration in `supabase/migrations/`. Never edit one already applied.
2. Update the CLI (`entities`, `reads` or a view) and any slash command that should show the change.
3. Settings changes are one line: `update settings set value=... where key=...` in a migration.
4. Add an assertion to `scripts/smoke.mjs` and run `npm test`, `npm run view` and `npm run docs`.
5. Run `npm run migrate` against the real database only after a backup and the operator's yes.

Never present an office policy as a legal rule. Never build a front end as part of this free base.
