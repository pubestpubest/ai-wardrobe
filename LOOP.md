# LOOP.md — PRD Queue-Drainer Loop

The loop that turns PRD.md into shipped features. One loop = one attempt at
one backlog item. Executed by `/drain` (`.claude/skills/drain/SKILL.md`).

## Shape

Queue-drainer, not scheduled triager. Nothing external generates work for
this repo (no CI inbox, no user issues), so the loop never runs on a timer —
it runs when invoked, drains the top of the queue, and stops.

## Naming

- **Backlog ID**: `B01`–`B16`, assigned in PRD §12. Queue order = tier order.
- **Loop number**: `L1` = first attempt at a backlog item; `L2`, `L3`… = each
  re-loop triggered by scrutinize findings on the same item.
- **Loop doc**: `loops/<ID>-L<n>.md` — one per loop, e.g. `loops/B01-L1.md`,
  written as the loop runs (template below).

## The pieces

| Piece      | Implementation                                                  | Model           |
| ---------- | --------------------------------------------------------------- | --------------- |
| Queue      | `PRD.md` §12 — backlog IDs `B01`–`B16`, tier order first        | —               |
| Memory     | PRD §11/§12 status + `loops/` docs + Loop Log below (the index) | —               |
| Automation | The skill, invoked manually per loop                            | —               |
| Plan check | `/grilling` in the main session — attended, pre-build           | session (Opus+) |
| Maker      | Implementer subagent — builds the item                          | **Sonnet**      |
| Checker    | `/scrutinize` via fresh subagent, post-build                    | **Opus**        |

Maker and checker are _different models_ on purpose — different models miss
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

- **Never** touch auth or RLS policies without an explicit human go. B07 shipped
  the foundation (`011`–`013`, `015`); changing it now breaks every scoped table.
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
- ⏭️ — deferred by a grill decision (folded into another item); the queue skips it

## Loop Log

<!-- newest first: date | <ID>-L<n> | ✅ done / 🔁 re-loop / ⛔ blocked | one-line note -->

_Queue state (2026-08-07, after B11): **B12–B16 remain in Tier 5**, then B08
(Tier 6). **Local Store (B11–B16) is complete.** Next `/drain` picks **B08 — Virtual
Try-On** (Tier 6), the only item left in the queue. Per PRD §12 it also absorbs
B04 (optional body measurements on `profiles`), and it needs the image-gen quota
resolved before it can generate for real — it is mocked today. Also outstanding
outside the queue: §13's action items, notably **STORE-2** (the seed store logins
use a published PIN and must be rotated or deleted before real users) and
**UX-1** (`virtual-model.tsx` captures a disabled-query null into `useState`
initializers — directly relevant to B08)._

_Superseded — queue state before B11: **B11–B16 (Local Store, PRD §12 Tier 5) queued ahead
of B08 — Virtual Try-On (Tier 6)**. Next `/drain` picks **B11**, which is gated
on **STORE-1** (§13): it adds RLS policies, so the guardrail below requires an
explicit human go before migration `018` is written. Local Store's design is
already settled in `LOCAL-STORE.md` — the grill step on each of B11–B16 should
question the *implementation* of that slice, not reopen the design._

_Queue state (2026-08-06): everything drained except **B08 — Virtual Try-On**.
Commits after B10 (poster page, docker/UI fixes) were direct work, not loops —
no Loop Log rows for them by design._

- 2026-08-07 | B16-L1 | ✅ done | Store admin + suspension enforcement — `/admin/stores` (set package, suspend/reinstate), and `027` adds `status='approved'` to the ownership policy so a suspended shop's writes are refused by the DATABASE, not just by a server function it could bypass via PostgREST (the fifth instance of that lesson on this feature). Pen-tested: suspended owner still SELECTs their catalog but INSERT is RLS-denied and UPDATE/DELETE match 0. Scrutinize found the home page still recommending suspended stores' items with a dead ดูที่ร้าน link — fixed by sourcing it from getDiscoverStores. **Local Store B11–B16 complete**
- 2026-08-07 | B15-L1 | ✅ done | AI weighting — two-step pick (weighted store, then uniform item) so catalog size and package weight stop multiplying; suspended + null-store rows excluded by an EXPLICIT query filter since findAffiliateProduct runs service-role and RLS is inert there (proven: suspending the premium store empties the accessory pool 9→0). Shipped `bun run check:weighting`, now in CI. Scrutinize caught that the check reimplemented the composition and so couldn't catch a revert — and my first fix was still vacuous because the pool's item counts were proportional to the weights, making uniform-per-item indistinguishable from weight-based; inverted the pool and sabotage-tested all three plausible reverts
- 2026-08-07 | B14b-L1 | ✅ done | Discover regroup into store cards — getDiscoverStores (suspension excluded by RLS, null-store rows by the .in filter), weighted-random order proven correct by extraction (premium-first 47.8% vs 47% theoretical, deterministic per seed), 6-item preview → /store/$id, search matches store names, AffiliateItemModal ดูที่ร้าน fallback adopted. Scrutinize caught that no mutation invalidated the new Discover cache — admin saves toasted success over a stale card; and fixing it surfaced that my own B14a-L2 auth middleware had left the products query firing unauthenticated with no session in its key
- 2026-08-07 | B14a-L1 | ✅ done | Store page + admin store dropdown — `/store/$id` (signed-in only; RLS hides suspended stores for free, verified), `listStoresForAdmin` + store `<select>` so admin items stop getting `store_id = null`. **Gate found a second cap bypass**: 025's trigger was INSERT-only, and B14a made UPDATE reachable via the admin path — an UPDATE moved 18 items into a cap-10 store; `026` closes it. Scrutinize (re-run after the first agent died mid-API-call) found a comment declaring that gap unfixed while its fix shipped alongside — the B12b-L2 failure mode again — plus an unauthenticated `getAffiliateProducts` that B14a had widened
- 2026-08-07 | B13b-L2 | ✅ done | Silent-save + input fixes — clearing an optional field was a no-op with a success toast (needed BOTH halves: emit "" and let the URL schemas accept ""); style field swallowed commas turning a,b into "ab"; zod now mirrors the DB CHECKs so raw English constraint text stops reaching the Thai UI; B10's admin editor given the same bounds so 024 doesn't regress it
- 2026-08-07 | B13b-L1 | 🔁 re-loop | Item CRUD — `024` ownership policy + narrow column grants + 7 CHECKs (14/14 pen-test). **Gate found the cap fully bypassable** — one PostgREST bulk insert put 17 rows in a cap-10 store, because grants bound columns and CHECKs bound values but nothing bounds a COUNT; `025` adds a before-insert trigger (human go taken), verified to hold under a 6-way race and to cap service-role too
- 2026-08-07 | B13a-L1 | ✅ done | Harden + read-only item list — `023` revokes table-wide insert/update/delete on affiliate_products from anon+authenticated (they were granted, and only the ABSENCE of a write policy blocked writes, so B13b's policy would have opened table-wide unvalidated writes); grill split B13 so no grant/policy ships ahead of its writer. **First clean scrutinize on this feature** — and it closed my verification gap by extracting the server-fn id from the client bundle and proving getMyStoreItems returns 18/12/9/5/4/2, disjoint, summing to the whole table
- 2026-08-07 | B12b-L3 | ✅ done | Fetch-failure branch — surfaced `isError` so a thrown getMyStore stops masquerading as "you have no store" (it was redirecting owners off /store/package and showing them the registration form, the L1 symptom through a different door); scrutinize's hook sweep also turned up a pre-existing worse variant in virtual-model.tsx, filed as UX-1
- 2026-08-07 | B12b-L2 | ✅ done | Disabled-query load state — `isLoading: !session || isLoading`; TanStack v5 reports isLoading===false for a query disabled by `enabled: !!session`, so every store page took its no-store branch on a cold load. My L1 gate accepted "200 + empty body" without asking why `store` was null — a status code is not a render check
- 2026-08-07 | B12b-L1 | 🔁 re-loop | Store shell — `022` column UPDATE grant (owner_user_id excluded so a store can't be transferred), `updateStore`, `/store` editor, `/store/package`, StoreBottomNav (ไอเท็ม disabled until B13), StoreGuard redirect; UPDATE path pen-tested with the discriminating owner_user_id case (GRANT-denied, not RLS-denied) and 021's CHECKs proven to bind UPDATE; **first loop in this feature where scrutinize found no authorization hole** — it found a load-state bug instead
- 2026-08-07 | B12a-L2 | ✅ done | Value constraints + guard ordering — migration `021` CHECKs (http(s)-only URLs, non-blank name, description cap, ≥1 contact) after scrutinize proved a column GRANT bounds columns not values and zod was bypassable by direct PostgREST (empty name + `javascript:` logo_url accepted live); also moved the wardrobe guard above the self-healing path where it was unreachable, and made a null count fail closed
- 2026-08-07 | B12a-L1 | 🔁 re-loop | Store registration — `020` column-level INSERT grant, `store.functions.ts`, `/store/register` + form, `role` on Profile, ProfileGate bypass, sign-in link; grill split B12 into B12a/B12b (past LOOP.md's ~400-line trigger); gate pen-tested the grant layer (package/status injection, cross-user insert, UPDATE, role self-set all denied) and ran the real zod schema against XSS payloads; scrutinize then found two majors
- 2026-08-07 | B11-L3 | ✅ done | Narrowed authorization — removed ALL `stores` write grants from `authenticated` (B11 has no user-scoped writer; a GRANT bypasses zod via PostgREST), read policy scoped `to authenticated`, revoked anon SELECT on stores + `profiles` DELETE; scrutinize found the SQL correct, its 4 handoff findings fixed in place (PRD B12/B13 + LOCAL-STORE.md §3 now state the grant/policy work each must add)
- 2026-08-07 | B11-L2 | 🔁 re-loop → ⛔ escalated | RLS hardening — dropped the premature `affiliate_products` item policy (returns in B13); gate caught TWO of my own errors: column `REVOKE` cannot subtract from a table-level GRANT (shipped inert, cited a false precedent), then the regrant omitted the upsert conflict key and broke profile editing for every user. Scrutinize then found the same class of hole on `stores` grants → LOOP.md L3 trigger, stopped and asked the human
- 2026-08-07 | B11-L1 | 🔁 re-loop | Store schema + seed — `stores`/`profiles.role`/`store_id`, 3 dropped NOT NULLs, 6 seed shops + logins, deterministic 18/12/9/5/4/2 over the 50 products; all 4 gates passed, then scrutinize found a privilege escalation I reproduced live (self-granted premium store → unvalidated catalog insert with a `javascript:` URL). Also corrected a false claim of mine in 3 docs (React renders `null` as nothing; `??` fires on `null`), which had made the L1 render gate vacuous
- 2026-07-19 | B10-L1 | ✅ done | Affiliate catalog admin editor — CRUD gated by env ADMIN_EMAILS allowlist (fail-closed), edit modal + live image preview; grill ruled out scraping; scrutinize fix-then-ship (URL-scheme XSS + button-nesting fixed; email-claim trust = ADMIN-1 deploy precondition)
- 2026-07-19 | B09-L1 | ✅ done | Background removal — @imgly client-side (free, on-device) + opt-in preview/revert in UploadItem; resolves Open Q 9.5; scrutinize fix-then-ship (stale-cutout leak on mid-removal close + button-on-cutout fixed)
- 2026-07-19 | B07d-L1 | ✅ done | Per-user AI quota — ai_usage table + atomic bump_ai_usage (chat 30/day, auto-tag 20/day), hard block; scrutinize ship-after-smoke-test, chat-bubble + anon-grant nits fixed. **Completes B07a–d**
- 2026-07-19 | B06-L1 | ✅ done | Affiliate Shopping UI Polish — client-side category chips + brand dropdown + search on Discover; thorough grill (store=brand-only, no platform); scrutinize ship, load-flash nit fixed
- 2026-07-19 | B05-L1 | ✅ done | Outfit History Calendar — new outfit_wears wear-log + "ใส่ชุดนี้วันนี้" + monthly calendar (toggle on Matches); scrutinize fix-then-ship: UTC→local date blocker + FK cascade→set null fixed
- 2026-07-19 | B04-L1 | ⏭️ deferred | Profile body measurements — grilled → deferred to B08 (YAGNI; try-on is the only consumer, last + mocked)
- 2026-07-19 | B07c-L1 | ✅ done | Scope matches + body-model + privatize scan bucket — RLS auth.uid()=user_id, signed URLs, getBodyModel global-latest leak fixed; gate caught a missed bucket consumer (try-on) fixed; scrutinize ship (major = pre-existing storage-write follow-up)
- 2026-07-19 | B07b-L1 | ✅ done | Scope items to user_id — RLS auth.uid()=user_id, user-scoped client, claimOrphanItems; scrutinize caught + fixed a removeItem IDOR (client-supplied imageUrl); claim land-grab mitigated (first-run-only) + gating flagged
- 2026-07-19 | B07a-L1 | ✅ done | Auth identity foundation — Supabase email+6-digit-PIN, auth gate, profiles table + RLS (profile off localStorage → DB); gate caught an SSR regression (fixed), scrutinize fix-then-ship (query-key user-scoping + gate window fixed); ⚠️ pending human: Supabase email auto-confirm + live smoke test
- 2026-07-19 | B03-L1 | ✅ done | Profile required fields — blocking onboarding gate (name/birthdate/gender), localStorage; scrutinize ship, 2 minors hardened (default-name AC no-op, stale-greeting → useSyncExternalStore)
- 2026-07-19 | B02-L1 | ✅ done | In-App Weather Status — OWM (server-side key) + geolocation → Home card + hint; scrutinize ship, 2 nits hardened in place
- 2026-07-19 | B01-L1 | ✅ done | Item Tags — predefined occasion tags (multi-select chips + search); major finding was a stale PRD wording, reconciled in place
