import { create } from "zustand";
import {
  TankBlueprint,
  calculateStats,
  TIER_UNLOCK_WAVES,
  getPart,
} from "../data/parts";
import { useAccountStore } from "./accountStore";

export type GamePhase = "garage" | "battle";

interface TankState {
  blueprint: TankBlueprint;
  setChassis: (id: string) => void;
  setEngine: (id: string) => void;
  setWeapon: (id: string) => void;

  coins: number;
  unlockedParts: string[];
  unlockedTier: number;
  highestWave: number;
  addCoins: (amount: number) => void;
  unlockPart: (id: string) => void;
  purchasePart: (id: string, cost: number) => boolean;
  reportWave: (wave: number) => void;
  isPartAvailable: (id: string) => boolean;

  phase: GamePhase;
  startBattle: () => void;
  returnToGarage: () => void;

  stats: ReturnType<typeof calculateStats>;

  persist: () => Promise<void>;
  hydrateFromAccount: () => Promise<void>;
}

const defaultBlueprint: TankBlueprint = {
  chassisId: "chassis_wasp",
  engineId: "engine_zephyr",
  weaponId: "weapon_rattlejack",
  name: "Wasp Scout",
};

const STARTER_PARTS = ["chassis_wasp", "engine_zephyr", "weapon_rattlejack"];

function snapshot(s: TankState) {
  return {
    coins: s.coins,
    unlockedParts: s.unlockedParts,
    unlockedTier: s.unlockedTier,
    highestWave: s.highestWave,
    blueprint: s.blueprint,
  };
}

export const useTankStore = create<TankState>((set, get) => ({
  blueprint: defaultBlueprint,
  coins: 2500,
  unlockedParts: [...STARTER_PARTS],
  unlockedTier: 1,
  highestWave: 0,
  phase: "garage",
  stats: calculateStats(defaultBlueprint),

  setChassis: (id) =>
    set((s) => {
      if (!s.unlockedParts.includes(id)) return s;
      const blueprint = { ...s.blueprint, chassisId: id };
      const next = { blueprint, stats: calculateStats(blueprint) };
      queueMicrotask(() => get().persist());
      return next;
    }),

  setEngine: (id) =>
    set((s) => {
      if (!s.unlockedParts.includes(id)) return s;
      const blueprint = { ...s.blueprint, engineId: id };
      const next = { blueprint, stats: calculateStats(blueprint) };
      queueMicrotask(() => get().persist());
      return next;
    }),

  setWeapon: (id) =>
    set((s) => {
      if (!s.unlockedParts.includes(id)) return s;
      const blueprint = { ...s.blueprint, weaponId: id };
      const next = { blueprint, stats: calculateStats(blueprint) };
      queueMicrotask(() => get().persist());
      return next;
    }),

  addCoins: (amount) => {
    set((s) => ({ coins: s.coins + amount }));
    queueMicrotask(() => get().persist());
  },

  unlockPart: (id) =>
    set((s) => ({
      unlockedParts: s.unlockedParts.includes(id)
        ? s.unlockedParts
        : [...s.unlockedParts, id],
    })),

  purchasePart: (id, cost) => {
    const { coins, unlockedParts, unlockedTier } = get();
    const part = getPart(id);
    if (!part) return false;
    if (part.tier > unlockedTier) return false;
    if (unlockedParts.includes(id)) return false;
    if (coins < cost) return false;
    set({
      coins: coins - cost,
      unlockedParts: [...unlockedParts, id],
    });
    queueMicrotask(() => get().persist());
    return true;
  },

  reportWave: (wave) => {
    const { highestWave, unlockedTier } = get();
    const nextHighest = Math.max(highestWave, wave);
    let tier = unlockedTier;
    if (nextHighest >= TIER_UNLOCK_WAVES[3]) tier = 3;
    else if (nextHighest >= TIER_UNLOCK_WAVES[2]) tier = Math.max(tier, 2);
    set({ highestWave: nextHighest, unlockedTier: tier });
    queueMicrotask(() => get().persist());
  },

  isPartAvailable: (id) => {
    const part = getPart(id);
    if (!part) return false;
    return part.tier <= get().unlockedTier;
  },

  startBattle: () => {
    get().persist();
    set({ phase: "battle" });
  },
  returnToGarage: () => {
    get().persist();
    set({ phase: "garage" });
  },

  persist: async () => {
    const s = get();
    await useAccountStore.getState().saveProgress(snapshot(s));
  },

  hydrateFromAccount: async () => {
    const data = await useAccountStore.getState().loadProgress();
    if (!data) {
      await get().persist();
      return;
    }
    const blueprint = data.blueprint || defaultBlueprint;
    const parts =
      data.unlockedParts?.length > 0 ? data.unlockedParts : [...STARTER_PARTS];
    set({
      coins: data.coins ?? 2500,
      unlockedParts: parts,
      unlockedTier: data.unlockedTier ?? 1,
      highestWave: data.highestWave ?? 0,
      blueprint,
      stats: calculateStats(blueprint),
      phase: "garage",
    });
  },
}));