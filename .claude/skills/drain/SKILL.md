---
name: drain
description: >
  Run one loop of the PRD queue-drainer defined in LOOP.md: pick the top
  backlog item from PRD §12, grill the plan, implement, gate, scrutinize,
  write the loop doc, and decide done/re-loop/blocked. Use when the user
  says /drain, "run a loop", "drain the backlog", or "next backlog item".
  Optional argument: a backlog ID (e.g. B02) to target a specific item
  instead of the top of the queue.
---

# Drain — execute one loop of LOOP.md

`LOOP.md` at the repo root is the single source of truth. Read it first on
every invocation — it may have been tweaked since this skill was written.
If this skill and LOOP.md disagree, **LOOP.md wins**.

## Scope of one invocation

One backlog item, start to finish. Re-loops on the *same* item (L2, L3)
continue within this invocation until ✅ done, ⛔ blocked, or the L3
escalation trigger fires. A *new* backlog item always means a new
invocation — never roll into the next ID after finishing one.

## Steps (operational notes on LOOP.md "One loop")

1. **Pick** — parse PRD.md §12. Take the topmost item not marked ✅ / ⛔ / ⏭️
   (deferred), skipping the "ไม่รวมในลำดับ" group. If an argument names a backlog ID,
   use that instead (refuse if it's already ✅). Loop number `n` = 1 + the
   highest existing `loops/<ID>-L*.md`, so numbering survives across
   sessions. Everything drained → report and stop.
2. **Grill** — draft a ≤ 5-bullet plan from the item's PRD §3 section, then
   invoke the `grilling` skill on that plan. This step is attended — wait
   for the human's answers, then amend the plan. Do not proceed on guesses.
   Runs in the main session (subagents can't converse with the human), so
   it uses the session model — if the session is below Opus, tell the user
   to `/model opus` and re-run before grilling.
3. **Loop doc** — create `loops/<ID>-L<n>.md` from the template in LOOP.md.
   Record the post-grill plan before writing code.
4. **Implement** — spawn an implementer subagent via the Agent tool with
   `model: "sonnet"`, run synchronously (`run_in_background: false`).
   Its prompt: the post-grill plan verbatim, the loop doc path, and the
   CLAUDE.md pattern — migration (`supabase/migrations/`) → server
   function (`src/lib/*.functions.ts`) → route/component, smallest
   complete diff. It runs `bun run lint` and `bun run build` itself
   before returning a summary of files touched.
5. **Gate** — verified by the main session (not the implementer), all
   four in order:
   - `bun run lint` clean
   - `bun run build` succeeds
   - migration applies cleanly on `bun run dev` cold start
   - feature reachable and renders in the app
   Gate failures go back to the implementer subagent (SendMessage) to fix.
   Two failed fix attempts on the same cause → ⛔ per LOOP.md: log it,
   update the loop doc, report, stop.
6. **Scrutinize** — spawn a fresh subagent via the Agent tool with
   `model: "opus"`, run synchronously. Its prompt: invoke the `scrutinize`
   skill on the change, with the loop doc's plan included so it reviews
   against intent, not just the diff. Fresh context, different model from
   the maker — that's the point. It returns findings with severities.
7. **Record & decide** — fill in the loop doc (gate results, findings,
   decision), then apply LOOP.md's decision rule:
   - major/blocking → new loop doc `<ID>-L<n+1>` with the fix plan, back
     to step 4 (re-grill only if the approach itself was challenged)
   - minors only → fix in place, note in doc
   - clean → ✅ in PRD §12, update §11.2, one line in the Loop Log,
     commit on `feat/<id>-<slug>`
   **Never push. Never open a PR.** The human reviews and pushes.

## Hard rules

- LOOP.md's Guardrails and Escalation sections apply verbatim — auth/RLS
  (B07) and destructive migrations need an explicit human go; product
  decisions get raised in the grill, never invented.
- Every invocation ends with a report: loop ID(s) run, decision, gate
  results, scrutinize summary, and what the next `/drain` would pick.
