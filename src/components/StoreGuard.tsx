import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";

// Store accounts get a completely separate shell (LOCAL-STORE.md §2) — a shop
// typing the bare domain, or following an old bookmark to a shopper route,
// must not render half-broken shopper UI: /wardrobe, /stylist and
// /virtual-model all depend on a body profile a store account never fills in.
function isStorePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/store" || p.startsWith("/store/");
}

export function StoreGuard() {
  const { session, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || authLoading || !session) return;
    // Wait for the profile query before trusting `role`. Note the direction:
    // the placeholder is DEFAULT_PROFILE (role: 'shopper') and this guard only
    // acts on role === 'store', so a premature read UNDER-redirects — it can
    // never send the wrong person somewhere. The check is kept because acting
    // on a stale read is still wrong, not because it prevents a misfire.
    //
    // It also does NOT remove the flash: this is a post-render effect, so a
    // store owner hitting `/` renders the whole shopper home (useWardrobe,
    // useAffiliateProducts, WeatherCard's server fn all fire) and then bounces.
    // Killing that would need `beforeLoad` on the shopper routes, not an
    // effect here. (Corrected in B12b-L2 — the original note had the hazard
    // backwards and the next loop would have trusted it.)
    if (profileLoading) return;
    if (profile.role === "store" && !isStorePath(pathname)) {
      navigate({ to: "/store", replace: true });
    }
  }, [mounted, authLoading, session, profileLoading, profile.role, pathname, navigate]);

  return null;
}
