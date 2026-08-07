/**
 * App-wide ambient layer, borrowed from `/poster`'s visual language: a few
 * heavily-blurred pastel orbs plus a fine grain, drifting very slowly.
 *
 * Deliberately NOT the poster's colour-gradient wash — the app keeps its own
 * near-white page background; this only tints through it.
 *
 * Three properties make it safe to mount once for every route:
 *  - `pointer-events-none`, so it can never intercept a tap. It spans the
 *    viewport and would otherwise swallow every click.
 *  - `-z-10`, which paints it after the body gradient but *behind* the page —
 *    the routes' `bg-[#FDFCFD]/75` is what lets it show through.
 *  - `fixed`, and a sibling of the routed content rather than an ancestor. A
 *    transformed ancestor becomes the containing block for `position: fixed`
 *    descendants, which would detach BottomNav and every modal from the
 *    viewport (the same trap `.page-enter` avoids by animating opacity only).
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-ambient absolute -top-32 -left-24 size-[28rem] rounded-full bg-lilac/25 blur-3xl" />
      <div
        className="animate-ambient absolute top-1/3 -right-28 size-[26rem] rounded-full bg-blush/20 blur-3xl"
        style={{ animationDelay: "-12s" }}
      />
      <div
        className="animate-ambient absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-sky/20 blur-3xl"
        style={{ animationDelay: "-24s" }}
      />
      {/* Grain, straight from the poster. Kept at a very low opacity — it reads
          as paper texture rather than noise, and it stops the blurred orbs from
          banding on wide gradients. */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
