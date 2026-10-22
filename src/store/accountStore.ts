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
  lastSaveError: string;
  setError: (msg: string) => void;
  init: () => Promise<void>;
  continueAsGuest: () => void;
  register: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  saveProgress: (data: Omit<CloudProgress, "updatedAt">) => Promise<void>;
  loadProgress: () => Promise<CloudProgress | null>;
}

const GUEST_KEY = "treads_progress_guest_v3";
const STARTER_PARTS = ["chassis_wasp", "engine_zephyr", "weapon_rattlejack"];

function cacheKey(userId: string) {
  return `treads_progress_cache_v3:${userId}`;
}

function defaultProgress(): CloudProgress {
  return {
    coins: 2500,
    unlockedParts: [...STARTER_PARTS],
    unlockedTier: 1,
    highestWave: 0,
    blueprint: {
      chassisId: "chassis_wasp",
      engineId: "engine_zephyr",
      weaponId: "weapon_rattlejack",
    },
    updatedAt: Date.now(),
  };
}

function rowToProgress(row: Record<string, unknown>): CloudProgress {
  const parts = row.unlocked_parts;
  let unlockedParts: string[] = [];
  if (Array.isArray(parts)) unlockedParts = parts.map(String);
  else if (typeof parts === "string") {
    try {
      unlockedParts = JSON.parse(parts);
    } catch {
      unlockedParts = [...STARTER_PARTS];
    }
  }
  if (!unlockedParts.length) unlockedParts = [...STARTER_PARTS];

  return {
    coins: Number(row.coins ?? 2500),
    unlockedParts,
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

function writeCache(userId: string | null, data: CloudProgress) {
  try {
    const key = userId ? cacheKey(userId) : GUEST_KEY;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function readCache(userId: string | null): CloudProgress | null {
  try {
    const key = userId ? cacheKey(userId) : GUEST_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CloudProgress;
  } catch {
    return null;
  }
}

function toRow(userId: string, data: Omit<CloudProgress, "updatedAt">) {
  return {
    user_id: userId,
    coins: Math.round(data.coins),
    unlocked_parts: data.unlockedParts,
    unlocked_tier: Math.round(data.unlockedTier),
    highest_wave: Math.round(data.highestWave),
    chassis_id: data.blueprint.chassisId,
    engine_id: data.blueprint.engineId,
    weapon_id: data.blueprint.weaponId,
    updated_at: new Date().toISOString(),
  };
}

async function pushToSupabase(userId: string, data: Omit<CloudProgress, "updatedAt">) {
  const row = toRow(userId, data);

  let { error } = await supabase.from("progress").upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("[Treads] upsert failed:", error.message, error);
    const ins = await supabase.from("progress").insert(row);
    if (ins.error) {
      console.error("[Treads] insert failed:", ins.error.message, ins.error);
      return ins.error.message;
    }
  }
  return null;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  authPhase: "boot",
  user: null,
  displayName: "",
  isGuest: false,
  error: "",
  loading: false,
  lastSaveError: "",

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
    } catch (e) {
      console.error("[Treads] init failed", e);
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
      } else if (!get().isGuest && get().authPhase === "play") {
        set({ user: null, displayName: "", authPhase: "auth" });
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
    if (!data.session) {
      set({
        error:
          "Check your email to confirm, then log in. (Or disable Confirm email in Supabase Auth settings.)",
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
    const seed = defaultProgress();
    writeCache(data.user.id, seed);
    const errMsg = await pushToSupabase(data.user.id, seed);
    if (errMsg) set({ lastSaveError: errMsg });
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
    if (!isGuest) await supabase.auth.signOut();
    set({
      user: null,
      displayName: "",
      isGuest: false,
      authPhase: "auth",
      error: "",
    });
  },

  saveProgress: async (data) => {
    const { user, isGuest } = get();
    const payload: CloudProgress = { ...data, updatedAt: Date.now() };

    writeCache(isGuest || !user ? null : user.id, payload);

    if (isGuest || !user) return;

    const errMsg = await pushToSupabase(user.id, data);
    if (errMsg) set({ lastSaveError: errMsg });
    else set({ lastSaveError: "" });
  },

  loadProgress: async () => {
    const { user, isGuest } = get();

    if (isGuest || !user) {
      return readCache(null);
    }

    const { data, error } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[Treads] loadProgress failed:", error.message, error);
      return readCache(user.id);
    }

    if (!data) {
      const cached = readCache(user.id);
      if (cached) return cached;
      const seed = defaultProgress();
      writeCache(user.id, seed);
      const errMsg = await pushToSupabase(user.id, seed);
      if (errMsg) set({ lastSaveError: errMsg });
      return seed;
    }

    const progress = rowToProgress(data as Record<string, unknown>);
    writeCache(user.id, progress);
    return progress;
  },
}));