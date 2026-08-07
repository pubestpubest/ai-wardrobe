# Local Store — feature design

Status: **designed, not implemented.** Every decision below was chosen by the
product owner in a grilling session; the rationale for the non-obvious ones is
kept inline so nobody re-litigates them later.

Local shops register on the site, manage their own catalog, and pay (out of
band) for a package that buys them catalog size, AI-recommendation frequency,
and Discover placement. Discover changes from a flat item grid to store cards
holding item sub-cards.

---

## 1. Data model

Three schema changes. That is the whole footprint — no roles table, no packages
table, no store-members table.

```sql
-- migration 018_local_store.sql

create table public.stores (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references auth.users on delete cascade,  -- null = seeded/unclaimed
  name            text not null,
  description     text,
  contact_phone   text,
  contact_line    text,
  contact_email   text,
  address         text,
  google_map_url  text,   -- http(s) only, enforced in zod
  online_store_url text,  -- http(s) only, enforced in zod
  logo_url        text,
  cover_url       text,
  package         text not null default 'free'
                    check (package in ('free','basic','premium')),
  status          text not null default 'approved'
                    check (status in ('approved','suspended')),
  created_at      timestamptz not null default now()
);
create unique index stores_owner_uniq on public.stores (owner_user_id)
  where owner_user_id is not null;   -- one store per account

alter table public.profiles
  add column role text not null default 'shopper'
    check (role in ('shopper','store'));

alter table public.affiliate_products
  add column store_id uuid references public.stores on delete cascade;

-- These four describe a MARKETPLACE listing. A shop in จตุจักร has no
-- "platform" and no Shopee deep-link, and they are all NOT NULL today
-- (006_affiliate.sql:11-16) — so a store-owner insert cannot satisfy them.
alter table public.affiliate_products
  alter column store         drop not null,
  alter column platform      drop not null,
  alter column affiliate_url drop not null;
-- emoji stays NOT NULL: the item form defaults it per category.
```

`affiliate_products.store` (free text) stays as a display fallback but stops
being written. Display name is `coalesce(stores.name, affiliate_products.store)`.

**Ripple from the dropped NOT NULLs.** `mapRow` (`affiliate.functions.ts:44-60`)
guards the already-nullable columns with `?? undefined` and leaves these three bare
**because** they were NOT NULL:

```ts
store: row.store,                 // :54 → returns null, not undefined
platform: row.platform,           // :55
affiliateUrl: row.affiliate_url,  // :59
```

This is not a rendering bug — React renders `null` and `undefined` identically as
nothing, and `??` is nullish-coalescing, so it fires on `null` too. The real
pre-fix symptom is narrower: `{p.store} · {p.platform}` renders an orphan `·`
separator with nothing on one or both sides when a value is absent. The guard is
still needed, for the type: `AffiliateProduct.store`/`platform`/`affiliateUrl`
must become genuinely optional (`string | undefined`, not `string | null`) so
B13's optional-vs-required zod schemas and "is this field present" checks agree
with the rest of the codebase's `?? undefined` convention. Add `?? undefined` to
all three in the same loop that drops the constraints.

Then every consumer must handle absence:

- `discover.tsx:161` renders `{p.store} · {p.platform}` — becomes the store name
  alone for local items.
- `AffiliateItemModal`'s buy button — falls back to `/store/${store_id}` when
  there is no `affiliate_url`.
- `AffiliateProductFields` (zod) — the fields stay **required on the admin path**
  (B10's editor still lists marketplace products) and are optional on the store
  path. Two schemas, one table.

### Package limits — code, not DB

Mirrors the existing `AI_LIMITS` pattern (`src/lib/wardrobe.ts:36`). Tuning a
tier is a one-line edit, not a migration plus a data update.

```ts
// src/lib/wardrobe.ts
export const STORE_PACKAGES = {
  free: { label: "ฟรี", maxItems: 10, weight: 1 },
  basic: { label: "เบสิก", maxItems: 50, weight: 3 },
  premium: { label: "พรีเมียม", maxItems: 200, weight: 8 },
} as const;
export type StorePackage = keyof typeof STORE_PACKAGES;
```

### Seed data

The 50 products seeded in `006/007/008` carry global brand names (Uniqlo, Zara,
Levi's…) — off-theme for a _local_ store feature, and their `store` text is free
text with no row to group by. The migration creates 6 fictional Thai local stores
with full profiles across all three package tiers and distributes the 50 products
among them. Discover then demos the real thing on first load: several cards of
differing size and tier. The stale brand name in `affiliate_products.store` stops
being displayed.

**Distribution is quota-aware, not uniformly random.** 50 products over 6 stores
averages ~8 each, which overflows the free tier's 10-item cap as soon as the
random draw is uneven — a seeded free store would start life at 13/10, and B13's
cap check would then refuse edits on a store that shipped over its own limit. So
the counts are fixed, sized to each tier, and they also make the Discover demo
better by giving the cards visibly different sizes:

| Store                  | Package | Items | Login                    |
| ---------------------- | ------- | ----: | ------------------------ |
| ร้านป้าหมวย สยาม       | premium |    18 | `paamuay@store.test`     |
| Chic Corner ทองหล่อ    | basic   |    12 | `chiccorner@store.test`  |
| ห้องเสื้อ พี่สม อารีย์ | basic   |     9 | `pheesom@store.test`     |
| ตู้เสื้อผ้าน้องเมย์    | free    |     5 | `nongmay@store.test`     |
| Lila Vintage เอกมัย    | free    |     4 | `lilavintage@store.test` |
| ร้านลุงชาติ จตุจักร    | free    |     2 | `lungchat@store.test`    |

Dev PIN for all six: **`246810`**. `.test` is an RFC 2606 reserved TLD — these
addresses are unroutable by design, so no mail can ever be sent to them (hence
`email_confirm: true` in the script).

> These are **dev fixtures with a published PIN**. Anything that can reach
> production must not know them — see §1's `SEED_STORES=1` guard and STORE-2 in
> PRD §13. Rotate or delete them before any real user touches the deployment.

Which 50 products land where is still arbitrary (any partition matching the
counts above is fine); only the counts are load-bearing.

### Seed accounts — a script, not the migration

The migration creates the store rows with `owner_user_id = null`. A separate
**`scripts/seed-stores.ts`** then creates one real login per seeded store, so the
owner dashboard is demoable on day one instead of only after someone registers by
hand.

It is a script and not part of migration `018` on purpose: creating `auth.users`
from raw SQL means hand-writing bcrypt hashes and `auth.identities` rows into
Supabase's internal auth schema — fragile, and exactly the surface LOOP.md's
guardrail protects. The admin API does it supported-ly.

```ts
// scripts/seed-stores.ts — run manually: bun run seed:stores
// Refuses to run unless SEED_STORES=1, so test logins can never reach prod.
// Idempotent: an existing email is skipped, not recreated.
for (const s of SEED_STORES) {
  const { data } = await admin.auth.admin.createUser({
    email: s.email, // paamuay@store.test …
    password: SEED_PIN, // "246810" — 6-digit, same shape as B07a's PIN-as-password
    email_confirm: true, // .test is unroutable, no mail can arrive
  });
  await admin.from("profiles").upsert({ user_id: data.user.id, role: "store", name: s.name });
  await admin.from("stores").update({ owner_user_id: data.user.id }).eq("name", s.name);
}
```

Consequences to keep in mind:

- `stores_owner_uniq` still holds — one account, one store.
- These accounts have `role = 'store'`, so `ProfileGate` never fires on them and
  they land straight on `/store`.
- Anything still holding `owner_user_id = null` after the script (a store added
  later by hand) stays unreachable from every "manage my store" query, which all
  filter on `owner_user_id = auth.uid()`.
- Credentials are dev fixtures. They must not be committed to a `.env` that ships,
  and `SEED_STORES=1` must never be set in the deployed environment.

---

## 2. Identity and routing

- One `auth.users` pool. `profiles.role` decides routing and UI; the `stores`
  row holds the data. **They must be kept in sync** — creating a store sets
  `role = 'store'` in the same server function.
- Registration entry point is **`/store/register`** — a separate URL that can be
  sent to shops. Same email+PIN auth as everyone else; `AuthGate` still gates it.
  After auth the store-registration form runs, which creates the `stores` row
  and flips `role`.
- **A shopper account cannot convert.** `/store/register` refuses when the account
  already owns wardrobe items — "บัญชีนี้ใช้งานเป็นผู้ใช้อยู่ กรุณาสมัครด้วยอีเมลอื่น".
  Flipping the role would otherwise strand their wardrobe: the rows survive and RLS
  still says they own them, but the redirect guard below means they can never open
  `/wardrobe` again. That is a deletion wearing a different hat. A shop owner who
  also uses the app personally keeps two logins, which is what they'd want anyway.
- **Required at registration:** `name`, plus at least one of phone / LINE /
  address — enforced in zod, not the DB, so the rule changes without a migration.
  Map URL, online shop, logo and cover are optional and filled in later from
  `/store`. A store card a shopper cannot act on is dead weight on Discover;
  "one of three" still lets a shop withhold a phone number it doesn't want public.
- **`ProfileGate` must bypass `/store/*`.** It currently blocks every route until
  name + birthdate + gender are filled in (`ProfileGate.tsx:23`,
  `use-profile.ts:35`) — personal onboarding a shop has no business answering, so
  without the bypass a store owner is trapped before they can even register.
  Bypass on **`/store/register` exactly** — not `/store/*`. That pathname is the
  only window where the role is still `shopper`; everything after registration is
  covered by the `role === 'store'` clause. Exempting the whole prefix would also
  exempt `/store/$id`, which after B14 is a page _shoppers_ reach from Discover —
  a brand-new shopper landing there would skip onboarding entirely. Pathname is
  reachable: `ProfileGate` renders
  inside `RootComponent`, the root route's component, which already calls
  `useRouterState` at `__root.tsx:116`.
- **Store-only shell.** `role = 'store'` lands on `/store` with its own BottomNav,
  **three tabs**: ร้านค้า (`/store`) / ไอเท็ม (`/store/items`) / บัญชี
  (`/store/package`). Shopper routes (wardrobe, stylist, virtual try-on) depend on
  a body profile a store never fills in and would half-break, so they are not shown.
  There is deliberately no โปรไฟล์ tab — a shop has no personal profile to edit,
  the store profile _is_ tab 1, and `/profile` is unreachable anyway under the
  redirect guard. `/store/package` therefore carries package + quota + upgrade
  contact + account email + ออกจากระบบ.

### Routes

| Route             | Who                 | What                                                         |
| ----------------- | ------------------- | ------------------------------------------------------------ |
| `/store/register` | logged-in, no store | Registration form → creates store, sets role                 |
| `/store`          | owner               | Store profile editor (contact, map, online shop, logo/cover) |
| `/store/items`    | owner               | Item CRUD + `7/10 ไอเท็ม` quota display                      |
| `/store/package`  | owner               | บัญชี tab — tier, quota, upgrade contact, email, logout      |
| `/store/$id`      | any signed-in user  | Store's full profile + entire catalog                        |

**`/store/$id` is not public**, despite being the natural page to send a shop.
`AuthGate.tsx:49` returns children only when a session exists, with no pathname
exemption — every router route is gated. (`/poster` escapes only by being a static
file `prod.ts` serves, outside the router.) Making it genuinely public would need
an AuthGate bypass plus an anon-client read path under RLS; decided against —
inside the product nothing is lost, since anyone who can see Discover is signed in.

**Store accounts are redirected off shopper routes.** One guard in `__root.tsx`
beside the existing gates: `role === 'store'` on a path outside `/store/*`
redirects to `/store`. Without it, a shop typing the bare domain gets the shopper
home wearing a store bottom nav — and `/wardrobe`, `/stylist` and `/virtual-model`
half-break on a body profile they never filled in.

**No store-deletion path.** `affiliate_products.store_id` cascades, so deleting a
store would silently take its whole catalog with no undo — and a `role='store'`
account would then sit on a shell whose nav points at nothing. Deletion is out of
scope (§7). Defensively, `/store` renders the registration form whenever
`role='store'` and no `stores` row exists, so the shell can never dead-end.

---

## 3. Authorization

Two models on one table is the trap to avoid. Split cleanly:

- **Store-owner writes** go through `context.supabase` (the user-scoped client)
  and are authorized by **RLS**, per CLAUDE.md. A bug in a store handler cannot
  touch another store's items because the database refuses.

```sql
create policy "Owners manage own store" on public.stores for all
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "Public read approved stores" on public.stores for select
  using (status = 'approved' or owner_user_id = auth.uid());

create policy "Owners manage own store items" on public.affiliate_products
  for all
  using (exists (select 1 from public.stores s
                 where s.id = affiliate_products.store_id
                   and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.stores s
                      where s.id = affiliate_products.store_id
                        and s.owner_user_id = auth.uid()));
```

**RLS is only half of it — column GRANTs are the other half.** Supabase grants
`anon`/`authenticated` table-wide INSERT/UPDATE/DELETE by default, and a bare
GRANT is a direct PostgREST path that bypasses `store.functions.ts` and its zod
`httpUrl` entirely. B11 therefore ships the policies but grants `authenticated`
**no write privilege at all** on `stores`, and column-restricted grants on
`profiles` (everything except `role`). Consequences for later loops:

- **B12 must add** `grant insert/update (<columns>) on public.stores to
authenticated`, beside the zod that makes those columns safe.
- **B13 must recreate** the `Owners manage own store items` policy (B11 removed
  it) _and_ keep `affiliate_products`' table-wide grants in mind — they still
  exist, so a permissive policy re-opens table-wide writes.
- **Never** resolve a `permission denied` with the table-wide form
  (`grant update on public.stores to authenticated`). That silently restores the
  privilege escalation B11-L1/L2 blocked on. Every future column needs its own
  column-level grant.
- Note also: `REVOKE ... (column)` cannot subtract from a table-level grant —
  revoke the table privilege first, then grant back the columns.

- **Admin writes** keep the existing service-role + `assertAdmin` path
  (`affiliate.functions.ts:19`). Admins also own: changing `stores.package`, and
  setting `status = 'suspended'`.

### Fixed constraints (not up for decision)

- The `httpUrl` zod refinement in `affiliate.functions.ts` exists because an
  admin-entered `javascript:`/`data:` URL renders as `<a href>`/`<img src>` for
  every viewer. With **self-registered** store owners writing, it stops being a
  typo guard and becomes the actual XSS boundary. It must cover the new write
  path **and** the three new href/src sinks on the store record:
  `google_map_url`, `online_store_url`, `logo_url`/`cover_url`.
- A store owner can name their store anything, including a real brand. Trust
  model is **auto-approve, admin suspends after the fact** (`status` column).
  Suspended stores vanish from Discover and from the AI pool; the owner still
  sees their own store page.

---

## 4. Package mechanics

### Item cap

Count-then-insert in the server function:

```ts
// ponytail: count-then-insert, not atomic — a double-submit could land item 11
// in a 10 cap. One extra clothing item costs nothing; make it a trigger only if
// caps ever gate real money.
```

### AI recommendation frequency — the core mechanic

`findAffiliateProduct` (`src/lib/affiliate.functions.ts:130-133`) today scores
every product in the category, keeps everything tied for the top score, and
picks **uniformly at random** among them.

Package enters **only at the tie-break**, never in the score. Relevance still
decides who enters the pool, so a premium store cannot buy past a genuinely
better match — the documented guarantee that "a single strong signal wins
outright" survives.

And the pick is **two-step: weighted store first, then uniform item within it.**

> Why two-step: the two package levers otherwise _multiply_. A premium store
> holds up to 20× more rows (200 vs 10) and each row would be 8× likelier —
> ~160× exposure, which is the hard-filter outcome arrived at by accident.
> Two-step pins the ratio at exactly the package weight (8:1) regardless of
> catalog size. A bigger catalog still helps honestly, by landing the store in
> more categories' pools.

```ts
// replaces: candidates[Math.floor(Math.random() * candidates.length)]
const byStore = groupBy(candidates, (r) => r.store_id);
const store = weightedPick([...byStore.keys()], (id) => STORE_PACKAGES[pkgOf(id)].weight);
const pick = randomOf(byStore.get(store));
```

**Every item belongs to a store, including admin-added ones.** B10's
`AffiliateEditModal` gains a store dropdown and `createAffiliateProduct` writes
`store_id`. Without this, an admin-added item would carry `store_id = null`
forever and be silently invisible to both the AI pool and Discover — a regression
nobody asked for. With it, the `store_id is null` filter below is a safety net
that never actually excludes a live row.

> **Ships in B14, not B16.** The `null` exclusion arrives with B14 (Discover) and
> B15 (AI pool). Leaving the dropdown until B16 would keep that exact regression
> live for two loops. It is a `<select>` and one insert field — it belongs with
> the change that makes it necessary.

Suspended stores and `store_id is null` rows are excluded from the pool before
scoring — as an **explicit join/filter in the query**, not via RLS.
`findAffiliateProduct` uses `adminClient()` (service-role), which bypasses every
policy, so the "Public read approved stores" policy does nothing on this path.

---

## 5. Discover page

Flat item grid → store cards holding item sub-cards. Search box and category
chips stay. (The brand dropdown removed earlier is unrelated — that was a
filter; this is a grouping.)

```
┌─ ร้านป้าหมวย · สยาม · พรีเมียม ──┐
│ 👕 👗 👟 👜 🧥 👖              │
│                  ดูทั้งหมด (47) → │
└────────────────────────────┘
```

- **Card ordering: weighted-random per page load** (same weights as the AI
  lottery), so a free store occasionally surfaces near the top instead of the
  page being a frozen ranking. **Compute the order once per visit** — memoized on
  the fetched data, not per render — otherwise cards jump around while the user
  types in the search box.
- **Preview cap ~6 items**, then `ดูทั้งหมด (n) →` to the public `/store/$id`
  page. Keeps Discover scannable at 200 items, and gives the store's contact
  info / map / online shop somewhere real to live.
- **Filtering hides empty stores.** Filter items first, drop any card left with
  nothing. Same mental model as today's flat grid; no rows of empty cards. The
  existing `ไม่พบไอเท็มที่ค้นหา` empty state fires when zero stores survive.
- **Search matches store names too**, not just item name/description. A hit on the
  store's name keeps that card with its **full** catalog; an item-only hit narrows
  the card's contents as above. Once a shop's name is the largest text on the card,
  typing it and finding nothing reads as a bug.

---

## 6. Images

Both upload and paste-a-URL.

Cheap because `uploadWardrobeImage` (`src/lib/upload.functions.ts`) is already
generic — data-URL in, public URL out, and only the bucket name ties it to
wardrobes. Reuse it; no new bucket, no new storage policies.

> Pre-existing, out of scope, but noted: that server function has **no auth
> middleware**, so it is an open upload endpoint today.

---

## 7. Explicitly out of scope

- Payments / self-serve upgrade. Packages are admin-assigned; the store sees
  `ติดต่อเพื่ออัปเกรด`. No billing code exists anywhere in this repo.
- Deleting a store (see §2 — cascades the catalog, dead-ends the shell).
- Multiple stores per account, or multiple staff per store.
- Store analytics (impressions, click-through on affiliate links).
- Claiming a seeded store by a real shop, or an admin action to reassign
  `owner_user_id`. The seed script is the only thing that ever sets an owner on a
  seeded store; a real shop registers its own.

---

## 8. Build order

Backlog IDs live in **PRD §12 Tier 5**; this is the same split with the
verification for each. Hard chain: B11 → B12 → B13 → B14/B15 → B16.

1. **B11** — migration `018` (tables, columns, RLS, seeded stores + backfill) +
   `STORE_PACKAGES` + `scripts/seed-stores.ts`.
   Verify: all 50 products carry a `store_id` spread across the seeded stores;
   Discover still renders unchanged; each seed login reaches `/store`.
   **Gated on STORE-1 (PRD §13) — it adds RLS, so it needs a human go.**
2. **B12** — `store.functions.ts` (create/read/update store) + `/store/register`
   - `/store` + `/store/package` + ProfileGate bypass + store BottomNav.
     Verify: a fresh account registers a store and edits its profile end-to-end.
3. **B13** — `/store/items` CRUD + package cap + image upload/paste.
   Verify: adding past the cap is refused; store A cannot edit store B's items.
4. **B14** — Discover regroup into store cards + public `/store/$id`.
   Verify: filtering hides empty stores; card order is stable while typing.
5. **B15** — `findAffiliateProduct` two-step weighted pick + suspended/null
   exclusion.
   Verify empirically — 1000 draws against a known pool land near 8:1, not 160:1.
6. **B16** — admin: set package, suspend store.
