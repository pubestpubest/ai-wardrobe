import { useCallback } from "react";
import { useProfile } from "@/hooks/use-profile";
import { openGuestGate } from "@/lib/guest-gate";

/** True when the signed-in account is the shared read-only demo account. */
export function useIsGuest(): boolean {
  const { profile } = useProfile();
  return profile.role === "guest";
}

/**
 * Returns a predicate to call at the top of any write action:
 *
 *   if (blockIfGuest("เพิ่มเสื้อผ้า")) return;
 *
 * It opens the explain-and-sign-up modal and reports true when the caller
 * should stop. This is for the MESSAGE only — migration 029's policies are what
 * actually refuse a guest's writes, including one made straight to PostgREST.
 */
export function useGuestGuard(): (action?: string) => boolean {
  const isGuest = useIsGuest();
  return useCallback(
    (action?: string) => {
      if (!isGuest) return false;
      openGuestGate(action);
      return true;
    },
    [isGuest],
  );
}
