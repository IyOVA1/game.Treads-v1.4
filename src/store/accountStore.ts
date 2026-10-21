import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type AuthPhase = "boot" | "auth" | "play";

export interface CloudProgress {
  coins: number;
  unlockedParts: string[];
  unlockedTier: number;
  highestWave: number;
  blueprint: {
    chassisId: string;
    engineId: string;
    weaponId: string;
    name?: string;
  };
  updatedAt?: number;
}

interface AccountState {
  authPhase: AuthPhase;
  user: User | null;
  displayName: string;
  isGuest: boolean;
  error: string;
  loading: boolean;
  setError: (msg: string) => void;
  init: () => Promise<void>;
  continueAsGuest: () => void;
  register: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  saveProgress: (data: Omit<CloudProgress, "updatedAt">) => void;
  loadProgress: () => Promise<CloudProgress | null>;
}

const GUEST_KEY = "treads_progress_guest_v3";

function rowToProgress(row: Record<string, unknown>): CloudProgress {
  return {
    coins: Number(row.coins ?? 2500),
    unlockedParts: (row.unlocked_parts as string[]) ?? [],
    unlockedTier: Number(row.unlocked_tier ?? 1),
    highestWave: Number(row.highest_wave ?? 0),
    blueprint: {
      chassisId: String(row.chassis_id ?? "chassis_wasp"),
      engineId: String(row.engine_id ?? "engine_zephyr"),
      weaponId: String(row.weapon_id ?? "weapon_rattlejack"),
    },
    updatedAt: row.updated_at ? Date.parse(String(row.updated_at)) : Date.now(),
  };
}

export const useAccountStore = create<AccountState>((set, get) => ({
  authPhase: "boot",
  user: null,
  displayName: "",
  isGuest: false,
  error: "",
  loading: false,

  setError: (error) => set({ error }),

  init: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        set({
          user: session.user,
          displayName: session.user.email?.split("@")[0] || "Pilot",
          isGuest: false,
          authPhase: "play",
          error: "",
        });
      } else {
        set({ authPhase: "auth", user: null, isGuest: false });
      }
    } catch {
      set({ authPhase: "auth", error: "Could not reach auth server" });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: session.user,
          displayName: session.user.email?.split("@")[0] || "Pilot",
          isGuest: false,
          authPhase: "play",
        });
      } else if (!get().isGuest) {
        // signed out
        const phase = get().authPhase;
        if (phase === "play") {
          set({ user: null, displayName: "", authPhase: "auth" });
        }
      }
    });
  },

  continueAsGuest: () => {
    set({
      user: null,
      displayName: "Guest",
      isGuest: true,
      authPhase: "play",
      error: "",
    });
  },

  register: async (email, password) => {
    const e = email.trim();
    const pw = password.trim();
    if (!e.includes("@")) {
      set({ error: "Use a real email address (e.g. you@email.com)" });
      return false;
    }
    if (pw.length < 6) {
      set({ error: "Password must be at least 6 characters" });
      return false;
    }
    set({ loading: true, error: "" });
    const { data, error } = await supabase.auth.signUp({ email: e, password: pw });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return false;
    }
    if (!data.user) {
      set({ error: "Sign up failed" });
      return false;
    }
    // If email confirmation is required, session may be null
    if (!data.session) {
      set({
        error: "Check your email to confirm, then log in. (Or disable email confirm in Supabase Auth settings for testing.)",
        authPhase: "auth",
      });
      return false;
    }
    set({
      user: data.user,
      displayName: e.split("@")[0],
      isGuest: false,
      authPhase: "play",
      error: "",
    });
    return true;
  },

  login: async (email, password) => {
    const e = email.trim();
    const pw = password.trim();
    if (!e || !pw) {
      set({ error: "Enter email and password" });
      return false;
    }
    set({ loading: true, error: "" });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: e,
      password: pw,
    });
    set({ loading: false });
    if (error) {
      set({ error: error.message });
      return false;
    }
    if (!data.user) {
      set({ error: "Login failed" });
      return false;
    }
    set({
      user: data.user,
      displayName: e.split("@")[0],
      isGuest: false,
      authPhase: "play",
      error: "",
    });
    return true;
  },

  logout: async () => {
    const { isGuest } = get();
    if (!isGuest) {
      await supabase.auth.signOut();
    }
    set({
      user: null,
      displayName: "",
      isGuest: false,
      authPhase: "auth",
      error: "",
    });
  },

  saveProgress: (data) => {
    const { user, isGuest } = get();
    if (isGuest || !user) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }));
      } catch {
        /* ignore */
      }
      return;
    }

    void supabase.from("progress").upsert(
      {
        user_id: user.id,
        coins: data.coins,
        unlocked_parts: data.unlockedParts,
        unlocked_tier: data.unlockedTier,
        highest_wave: data.highestWave,
        chassis_id: data.blueprint.chassisId,
        engine_id: data.blueprint.engineId,
        weapon_id: data.blueprint.weaponId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  },

  loadProgress: async () => {
    const { user, isGuest } = get();
    if (isGuest || !user) {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CloudProgress;
      } catch {
        return null;
      }
    }

    const { data, error } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProgress(data as Record<string, unknown>);
  },
}));
