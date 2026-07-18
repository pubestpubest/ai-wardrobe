import { useSyncExternalStore } from "react";

const PROFILE_KEY = "wardrobe.profile";

export type Gender = "" | "male" | "female" | "other";

export type Profile = {
  name: string;
  handle: string;
  email: string;
  bio: string;
  favoriteStyle: string;
  avatarUrl: string;
  gender: Gender;
  birthdate: string;
  heightCm: string;
  weightKg: string;
};

export const DEFAULT_PROFILE: Profile = {
  name: "",
  handle: "@pubest",
  email: "pubestpubest@gmail.com",
  bio: "ชอบสไตล์มินิมอลโทนพาสเทล ❀",
  favoriteStyle: "Minimal · Pastel",
  avatarUrl: "",
  gender: "",
  birthdate: "",
  heightCm: "",
  weightKg: "",
};

export function isProfileComplete(p: Profile): boolean {
  if (!p.name.trim() || !p.gender || !p.birthdate) return false;
  const d = new Date(p.birthdate);
  return !Number.isNaN(d.getTime()) && d <= new Date();
}

function readProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

// ponytail: module-level shared store so every useProfile() instance stays in
// sync (a gate write shows up in the home greeting without a reload). Single
// tab only — add a `storage` listener if cross-tab sync is ever needed.
let current: Profile | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Profile {
  if (current === null) current = readProfile();
  return current;
}

function getServerSnapshot(): Profile {
  return DEFAULT_PROFILE;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function writeProfile(next: Profile) {
  current = next;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // storage full / disabled — silently skip
  }
  listeners.forEach((l) => l());
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    profile,
    update: (patch: Partial<Profile>) => writeProfile({ ...getSnapshot(), ...patch }),
  };
}
