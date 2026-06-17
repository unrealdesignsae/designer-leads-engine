"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchProfiles } from "./api";
import { DEFAULT_PROFILE, SEED_PROFILES } from "./leads-data";
import type { Profile, ProfileId } from "./types";

type ProfilesContextValue = {
  profiles: Profile[];
  activeProfileId: ProfileId;
  activeProfile: Profile;
  loadingProfiles: boolean;
  switchProfile: (profileId: ProfileId) => void;
  addProfile: (profile: Profile) => void;
};

const STORAGE_KEY = "designer-leads-engine.profiles";
const ACTIVE_KEY = "designer-leads-engine.active-profile";

const ProfilesContext = createContext<ProfilesContextValue>({
  profiles: SEED_PROFILES,
  activeProfileId: DEFAULT_PROFILE.id,
  activeProfile: DEFAULT_PROFILE,
  loadingProfiles: true,
  switchProfile: () => {},
  addProfile: () => {},
});

export function useProfiles() {
  return useContext(ProfilesContext);
}

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    if (typeof window === "undefined") return SEED_PROFILES;
    try {
      const storedProfiles = window.localStorage.getItem(STORAGE_KEY);
      if (!storedProfiles) return SEED_PROFILES;
      const parsed = JSON.parse(storedProfiles) as Profile[];
      return parsed.length > 0 ? parsed : SEED_PROFILES;
    } catch {
      return SEED_PROFILES;
    }
  });
  const [activeProfileId, setActiveProfileId] = useState<ProfileId>(() => {
    if (typeof window === "undefined") return DEFAULT_PROFILE.id;
    return window.localStorage.getItem(ACTIVE_KEY) || DEFAULT_PROFILE.id;
  });
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    fetchProfiles()
      .then((remoteProfiles) => {
        if (remoteProfiles.length > 0) {
          setProfiles((current) => {
            const merged = mergeProfiles(remoteProfiles, current);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROFILES));
      })
      .finally(() => setLoadingProfiles(false));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_KEY, String(activeProfileId));
  }, [activeProfileId]);

  const activeProfile =
    profiles.find((profile) => String(profile.id) === String(activeProfileId)) ||
    profiles.find((profile) => profile.slug === String(activeProfileId)) ||
    DEFAULT_PROFILE;

  const value = useMemo<ProfilesContextValue>(
    () => ({
      profiles,
      activeProfileId: activeProfile.id,
      activeProfile,
      loadingProfiles,
      switchProfile: setActiveProfileId,
      addProfile: (profile) => {
        setProfiles((current) => mergeProfiles(current, [profile]));
        setActiveProfileId(profile.id);
      },
    }),
    [activeProfile, loadingProfiles, profiles]
  );

  return (
    <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>
  );
}

function mergeProfiles(first: Profile[], second: Profile[]): Profile[] {
  // Dedupe by slug (the stable identity across seed + DB), first wins.
  // `first` is the authoritative source (remote DB profiles), so a real
  // uuid-keyed profile takes precedence over the slug-keyed seed fallback.
  const map = new Map<string, Profile>();
  [...first, ...second].forEach((profile) => {
    const key = profile.slug || String(profile.id);
    if (!map.has(key)) map.set(key, profile);
  });
  return Array.from(map.values());
}
