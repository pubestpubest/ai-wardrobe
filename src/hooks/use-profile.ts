import { useEffect, useState } from "react";

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
  heightCm: string;
  weightKg: string;
};

export const DEFAULT_PROFILE: Profile = {
  name: "พุเบสต์",
  handle: "@pubest",
  email: "pubestpubest@gmail.com",
  bio: "ชอบสไตล์มินิมอลโทนพาสเทล ❀",
  favoriteStyle: "Minimal · Pastel",
  avatarUrl: "",
  gender: "",
  heightCm: "",
  weightKg: "",
};

function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // storage full / disabled — silently skip
    }
  }, [profile]);

  return {
    profile,
    update: (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })),
  };
}
