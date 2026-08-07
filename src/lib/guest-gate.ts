// Tiny external store for the "guests can't do that" modal.
//
// A module singleton rather than context: the guard is called from inside
// mutation wrappers in hooks, which aren't always under a provider the way a
// component tree is, and every caller wants the same single modal.
let open = false;
let action: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openGuestGate(what?: string) {
  open = true;
  action = what ?? null;
  emit();
}

export function closeGuestGate() {
  open = false;
  action = null;
  emit();
}

export function subscribeGuestGate(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getGuestGateSnapshot() {
  return open ? (action ?? "") : null;
}

// Server-side there is no modal and no guest session; a stable null keeps
// useSyncExternalStore from looping on a fresh value each render.
export function getGuestGateServerSnapshot(): string | null {
  return null;
}
