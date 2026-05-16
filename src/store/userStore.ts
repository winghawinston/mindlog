// ============================================================
// USER STORE — Zustand
//
// Holds the logged-in user's profile data globally.
// Any component in the app can read or update this without
// prop drilling or re-fetching from Supabase repeatedly.
//
// Why persist? So the user's profile survives a page refresh
// without a loading flash. We re-validate from Supabase on
// app load, but the cached value shows immediately.
//
// Why NOT put auth session here?
// Supabase manages the session via cookies. We never store
// the JWT or session object in client state — that's a
// security risk. We only store non-sensitive profile data.
// ============================================================

import type { Profile } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  // the logged-in user's profile row from public.profiles.
  // null if not logged in or profile not loaded yet.
  profile: Profile | null;

  // actions — functions that update the store
  setProfile: (profile: Profile) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>()(
  // persist middleware saves the store to localStorage automatically.
  // On next load, the cached profile shows instantly while we re-fetch.
  persist(
    (set) => ({
      profile: null, // initial state

      setProfile: (profile) => set({ profile }),

      // called on logout to clear the profile from state and localStorage
      // — wipes the cached profile immediately from memory and storage, then Supabase auth state changes to unauthenticated.
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: "mindlog-user", // name of the item in storage
      // Only persist the profile, not the action functions.
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)