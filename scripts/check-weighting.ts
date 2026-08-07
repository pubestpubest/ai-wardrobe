// Verifies the AI recommendation / Discover weighting rule (LOCAL-STORE.md
// §4, B15-L1). This is the monetization mechanic and it fails SILENTLY — no
// error, no crash, a premium store just quietly stops winning — and no other
// gate (lint/build/tsc) can see a distribution. This script is the one thing
// that can.
//
// Imports the REAL helpers from src/lib/wardrobe.ts (no reimplementation),
// runs the same two-step pick findAffiliateProduct uses over a synthetic
// pool, and asserts the per-store win share lands near the package-weight
// share — not the item-count share.
//
// Run manually: bun run check:weighting
// Needs no database and no env vars — pure computation over a synthetic pool,
// modeled on scripts/migrate.ts / scripts/seed-stores.ts for the run shape,
// but with none of their env-var plumbing.
import {
  mulberry32,
  weightedPick,
  weightedPickByGroup,
  STORE_PACKAGES,
  type StorePackage,
} from "../src/lib/wardrobe";

type Item = { id: string; storeId: string };
type Store = { id: string; pkg: StorePackage; itemCount: number };

// 1 premium / 2 basic / 3 free, mirroring the seeded shape (LOCAL-STORE.md §1).
//
// Item counts are deliberately INVERSE to package weight — the premium store
// carries the FEWEST items, the free stores the most. That inversion is what
// makes this check load-bearing: if counts were proportional to weight (the
// obvious choice, and what this file shipped with first), then "pick uniformly
// among all items" and "weight by package" produce the SAME distribution, and
// the check passes against a reverted composition. Verified by sabotage: with
// proportional counts a uniform-per-item revert still printed OK.
//
// With this pool the three behaviours are far apart for premium-1:
//   weight-based (correct)        ~47%   (8 of 17 total weight)
//   uniform per item (a revert)   ~2.6%  (2 of 78 items)
//   naive weight x count          ~13%   (16 of 124 weighted items)
const STORES: Store[] = [
  { id: "premium-1", pkg: "premium", itemCount: 2 },
  { id: "basic-1", pkg: "basic", itemCount: 8 },
  { id: "basic-2", pkg: "basic", itemCount: 8 },
  { id: "free-1", pkg: "free", itemCount: 20 },
  { id: "free-2", pkg: "free", itemCount: 20 },
  { id: "free-3", pkg: "free", itemCount: 20 },
];

const ITEMS: Item[] = STORES.flatMap((s) =>
  Array.from({ length: s.itemCount }, (_, i) => ({ id: `${s.id}-item-${i}`, storeId: s.id })),
);

const DRAWS = 20_000;
// Deterministic — a fixed seed means this check never flakes in CI.
const rand = mulberry32(42);

const weightByStoreId = new Map(STORES.map((s) => [s.id, STORE_PACKAGES[s.pkg].weight]));

// ─── Two-step pick — calls the SHIPPED composition (wardrobe.ts's
// weightedPickByGroup), the exact function findAffiliateProduct uses. It is
// imported, not mirrored: a check that reimplements the composition passes even
// when the composition reverts, which is the only regression worth catching.
// ───────────────────────────────────────────────────────────────────────────
const storeIds = [...new Set(ITEMS.map((i) => i.storeId))];
const twoStepWins = new Map<string, number>(storeIds.map((id) => [id, 0]));
for (let i = 0; i < DRAWS; i++) {
  const pick = weightedPickByGroup(
    ITEMS,
    (item) => item.storeId,
    (id) => weightByStoreId.get(id)!,
    rand,
  );
  if (!pick) throw new Error("[check:weighting] weightedPickByGroup returned null unexpectedly");
  twoStepWins.set(pick.storeId, (twoStepWins.get(pick.storeId) ?? 0) + 1);
}

// ─── Naive per-item pick, for comparison only: weight EVERY item directly
// by its store's package weight, ignoring catalog size. This is the
// ~160x-by-accident failure mode LOCAL-STORE.md §4 warns about — printed so
// it's visible in output rather than folklore. ─────────────────────────────
const naiveWins = new Map<string, number>(storeIds.map((id) => [id, 0]));
for (let i = 0; i < DRAWS; i++) {
  const pick = weightedPick(ITEMS, (item) => weightByStoreId.get(item.storeId)!, rand);
  if (!pick) throw new Error("[check:weighting] naive pick returned null unexpectedly");
  naiveWins.set(pick.storeId, (naiveWins.get(pick.storeId) ?? 0) + 1);
}

const totalWeight = STORES.reduce((sum, s) => sum + STORE_PACKAGES[s.pkg].weight, 0);
const totalItems = ITEMS.length;

function pct(n: number, of: number): string {
  return `${((n / of) * 100).toFixed(2)}%`;
}

console.log("[check:weighting] pool: 1 premium (20 items) / 2 basic (8 each) / 3 free (2 each)");
console.log(`[check:weighting] total weight = ${totalWeight}, total items = ${totalItems}`);
console.log("");
console.log("store       package  weight  items  weight-share  two-step-share  naive-item-share");
for (const s of STORES) {
  const weight = STORE_PACKAGES[s.pkg].weight;
  console.log(
    `${s.id.padEnd(11)} ${s.pkg.padEnd(8)} ${String(weight).padEnd(7)} ${String(s.itemCount).padEnd(6)} ${pct(
      weight,
      totalWeight,
    ).padEnd(
      13,
    )} ${pct(twoStepWins.get(s.id) ?? 0, DRAWS).padEnd(16)} ${pct(naiveWins.get(s.id) ?? 0, DRAWS)}`,
  );
}
console.log("");

// ─── Assertions: two-step must track WEIGHT share, not item-count share. ──
// Tolerance is generous relative to sampling noise (std. error for the
// premium share at n=20000 is ~0.35 percentage points) but tight enough that
// a regression back to per-item or pure-uniform weighting fails loudly.
const TOLERANCE = 0.03; // 3 percentage points
let failed = false;

for (const s of STORES) {
  const expectedShare = STORE_PACKAGES[s.pkg].weight / totalWeight;
  const actualShare = (twoStepWins.get(s.id) ?? 0) / DRAWS;
  const deviation = Math.abs(actualShare - expectedShare);
  if (deviation > TOLERANCE) {
    failed = true;
    console.error(
      `[check:weighting] FAIL: ${s.id} (${s.pkg}) expected ~${pct(
        STORE_PACKAGES[s.pkg].weight,
        totalWeight,
      )} of wins, got ${pct(twoStepWins.get(s.id) ?? 0, DRAWS)} (deviation ${(deviation * 100).toFixed(2)}pp > ${TOLERANCE * 100}pp tolerance)`,
    );
  }
}

// Sanity check the premium store's naive-vs-two-step gap is actually large —
// Direction-agnostic on purpose: with weight-inverse item counts the naive arm
// UNDERSHOOTS rather than overshoots. What matters is that the two disagree —
// if they agree, the pool can't distinguish the behaviours and the check proves
// nothing, which is exactly the vacuity this file was rewritten to escape.
const premiumTwoStep = (twoStepWins.get("premium-1") ?? 0) / DRAWS;
const premiumNaive = (naiveWins.get("premium-1") ?? 0) / DRAWS;
if (Math.abs(premiumNaive - premiumTwoStep) < 0.1) {
  failed = true;
  console.error(
    `[check:weighting] FAIL: naive per-item share (${pct(naiveWins.get("premium-1") ?? 0, DRAWS)}) should diverge sharply from the two-step share (${pct(
      twoStepWins.get("premium-1") ?? 0,
      DRAWS,
    )}) for the premium store. They agree, so this pool cannot tell the two behaviours apart and the check is vacuous — see the STORES comment about inverse item counts.`,
  );
}

if (failed) {
  console.error("[check:weighting] FAILED — weighting has drifted from the package-weight ratio.");
  process.exit(1);
}

console.log("[check:weighting] OK — two-step pick tracks package weight, not catalog size.");
