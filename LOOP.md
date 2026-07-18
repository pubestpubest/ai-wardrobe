# LOOP.md — PRD Queue-Drainer Loop

The loop that turns PRD.md into shipped features. One loop = one attempt at
one backlog item. Executed by `/drain` (`.claude/skills/drain/SKILL.md`).

## Shape

Queue-drainer, not scheduled triager. Nothing external generates work for
this repo (no CI inbox, no user issues), so the loop never runs on a timer —
it runs when invoked, drains the top of the queue, and stops.

## Naming

- **Backlog ID**: `B01`–`B09`, assigned in PRD §12. Queue order = tier order.
- **Loop number**: `L1` = first attempt at a backlog item; `L2`, `L3`… = each
  re-loop triggered by scrutinize findings on the same item.
- **Loop doc**: `loops/<ID>-L<n>.md` — one per loop, e.g. `loops/B01-L1.md`,
  written as the loop runs (template below).

## The pieces

| Piece      | Implementation                                                     | Model              |
| ---------- | ------------------------------------------------------------------ | ------------------ |
| Queue      | `PRD.md` §12 — backlog IDs `B01`–`B09`, tier order first           | —                  |
| Memory     | PRD §11/§12 status + `loops/` docs + Loop Log below (the index)    | —                  |
| Automation | The skill, invoked manually per loop                                | —                  |
| Plan check | `/grilling` in the main session — attended, pre-build               | session (Opus+)    |
| Maker      | Implementer subagent — builds the item                              | **Sonnet**         |
| Checker    | `/scrutinize` via fresh subagent, post-build                        | **Opus**           |

Maker and checker are *different models* on purpose — different models miss
different things. The grill can't be a subagent (subagents can't converse
with the human), so it runs in the main session; keep the session on Opus
or better.

## One loop

1. **Pick** — topmost PRD §12 item not marked ✅ / ⛔ / awaiting decision.
   Everything drained → report and stop.
2. **Grill** — draft the plan (≤ 5 bullets from the item's §3 acceptance
   criteria), then run the `grilling` skill against it. Amend the plan with
   what survives. Attended by design — this is where the human shapes the
   work.
3. **Open the loop doc** — create `loops/<ID>-L<n>.md` from the template.
   Record the post-grill plan.
4. **Implement** — delegated to a **Sonnet** implementer subagent, which
   gets the post-grill plan and follows the CLAUDE.md pattern, smallest
   complete diff: migration → server function (`src/lib/*.functions.ts`)
   → route/component.
5. **Gate** — all must pass:
   - `bun run lint` clean
   - `bun run build` succeeds
   - migration applies cleanly on `bun run dev` cold start
   - feature reachable and renders in the app
   Two failed fix attempts on the same cause → mark ⛔, log, stop, report.
6. **Scrutinize** — a fresh **Opus** subagent runs the `scrutinize` skill
   on the change. The maker never grades itself — and here the checker
   isn't even the same model. Top things to attack: `session_id` scoping
   (guest mode), acceptance criteria coverage, the untraced code path.
7. **Record & decide** — write gate results + scrutinize findings into the
   loop doc, then:
   - **Major / blocking finding** → this loop ends without ✅. Start
     `<ID>-L<n+1>`: new loop doc with the fix plan, back to step 4.
     Re-grill (step 2) only if scrutinize challenged the approach itself,
     not just the code.
   - **Minor findings only** → fix in place, note in the doc.
   - **Clean (or minors fixed)** → mark ✅ in PRD §12, update §11.2, append
     one line to the Loop Log, commit on `feat/<id>-<slug>`.
     **Do not push, do not open a PR** — the human reviews and pushes.
   Next invocation starts the next backlog ID at L1.

## Loop doc template

```markdown
# <ID>-L<n> — <item name>

**Backlog:** <ID> (PRD §12) · **Loop:** L<n> · **Date:** YYYY-MM-DD
**Previous loop:** <ID>-L<n-1> | none

## Plan (post-grill)

- ...

## Implemented

- <file / migration number — one line each>

## Gate

lint ✅/❌ · build ✅/❌ · migration ✅/❌ · renders ✅/❌

## Scrutinize findings

- <severity> — <finding> — <fixed here | deferred to L<n+1>>

## Decision

✅ done | 🔁 re-loop → <ID>-L<n+1> (reason) | ⛔ blocked (reason)
```

## Guardrails

- **Never** touch auth, RLS policies, or migration `003` reversal without an
  explicit human go — B07 is Tier 4; it doesn't get drained casually.
- **Never** run destructive migrations (DROP, data-losing ALTER) without an
  explicit human go.
- Product decisions beyond the PRD (naming, UX flow, scope additions) →
  raise them in the grill step or mark ⛔ — don't invent.
- One backlog item per loop. A re-loop (L2+) stays on the same item until
  ✅ or ⛔ — no starting the next ID with findings open.
- Token sanity: one implementer subagent + one scrutinize subagent per
  loop, plus the grill in-session. More than that means something is
  over-engineered — stop and simplify.

## Escalation (stop-and-ask triggers)

- Acceptance criteria conflict with existing code or another PRD section
- The item needs a new external dependency or API key
- Gate fails twice on the same cause
- The diff wants to exceed ~400 lines — item is bigger than the PRD implies;
  split it in the loop doc and ask
- Scrutinize majors survive two re-loops (L3 reached) — approach is wrong,
  stop and rethink with the human

## Known weakness (accepted for v1)

No test suite exists, so the gate is lint + build + render + scrutinize — a
strong claim, not proof. Human reviews every diff before push. Upgrade path:
add smoke checks for server functions when the gate misses its first real
bug, not before.

## Status markers (PRD §12)

- (no marker) — not started
- ✅ — done, gate passed, scrutinize clean, committed
- ⛔ — blocked, reason in the loop doc + Loop Log

## Loop Log

<!-- newest first: date | <ID>-L<n> | ✅ done / 🔁 re-loop / ⛔ blocked | one-line note -->

- 2026-07-19 | B07b-L1 | ✅ done | Scope items to user_id — RLS auth.uid()=user_id, user-scoped client, claimOrphanItems; scrutinize caught + fixed a removeItem IDOR (client-supplied imageUrl); claim land-grab mitigated (first-run-only) + gating flagged
- 2026-07-19 | B07a-L1 | ✅ done | Auth identity foundation — Supabase email+6-digit-PIN, auth gate, profiles table + RLS (profile off localStorage → DB); gate caught an SSR regression (fixed), scrutinize fix-then-ship (query-key user-scoping + gate window fixed); ⚠️ pending human: Supabase email auto-confirm + live smoke test
- 2026-07-19 | B03-L1 | ✅ done | Profile required fields — blocking onboarding gate (name/birthdate/gender), localStorage; scrutinize ship, 2 minors hardened (default-name AC no-op, stale-greeting → useSyncExternalStore)
- 2026-07-19 | B02-L1 | ✅ done | In-App Weather Status — OWM (server-side key) + geolocation → Home card + hint; scrutinize ship, 2 nits hardened in place
- 2026-07-19 | B01-L1 | ✅ done | Item Tags — predefined occasion tags (multi-select chips + search); major finding was a stale PRD wording, reconciled in place
