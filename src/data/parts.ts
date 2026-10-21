// The Arsenal — Part Schema & Registry (Phase 1)
// 3 tiers · Chassis / Weapon / Engine · clean multiples of 50 on weight

export type PartCategory = "chassis" | "engine" | "weapon";
export type ChassisAbilityId =
  | "afterburners"
  | "doomshock"
  | "personal_shield"
  | "rejuvenation_field"
  | "radar_jammer";
export type WeaponType =
  | "assault"
  | "cannon"
  | "mortar"
  | "plasma"
  | "energy"
  | "special";

export interface BasePart {
  id: string;
  name: string;
  category: PartCategory;
  tier: number; // 1 | 2 | 3
  cost: number; // credits (0 = starter owned)
  weight: number; // kg, multiples of 50
  description: string;
}

export interface ChassisPart extends BasePart {
  category: "chassis";
  hp: number;
  armor: number; // flat reduction (small)
  size: [number, number, number]; // w, h, l — visual / hull sample
  wheelBase: number;
  abilityId: ChassisAbilityId;
  abilityName: string;
  abilityDescription: string;
  abilityCooldown: number; // seconds
  // ability-specific numbers (read by ability system in Phase 2)
  abilityDuration?: number;
  abilityShieldHp?: number;
  abilitySpeedBonus?: number;
  abilityRadius?: number;
  abilityHealPerSec?: number;
  abilityDamagePerSec?: number;
  abilityDamageReduction?: number;
}

export interface EnginePart extends BasePart {
  category: "engine";
  maxSpeed: number; // m/s style units used by PlayerTank
  weightLimit: number; // soft top-speed penalty above this
  climbLimit: number; // uphill struggle above this
}

export interface WeaponPart extends BasePart {
  category: "weapon";
  weaponType: WeaponType;
  damage: number; // per shot (or per-sec for continuous)
  rpm: number; // rounds per minute (0 for charge weapons)
  magazine: number; // 0 = infinite / charge
  reload: number; // seconds
  range: number; // meters (game units)
  // derived helpers for combat
  projectileSpeed: number;
  arc: number; // max elevation degrees
  recoil: number;
  splashDamage?: number;
  splashRadius?: number;
  // special flags
  isCharge?: boolean; // Arc Halo
  isRicochet?: boolean;
  volleyCount?: number; // Skyshatter
}

export type AnyPart = ChassisPart | EnginePart | WeaponPart;

export interface TankBlueprint {
  chassisId: string;
  engineId: string;
  weaponId: string;
  name?: string;
}

// ---------- CHASSIS (5) ----------
export const CHASSIS: ChassisPart[] = [
  {
    id: "chassis_wasp",
    name: "Wasp",
    category: "chassis",
    tier: 1,
    cost: 0,
    weight: 2000,
    hp: 1500,
    armor: 5,
    size: [2.2, 0.9, 3.4],
    wheelBase: 2.6,
    abilityId: "afterburners",
    abilityName: "Afterburners",
    abilityDescription: "+50% movement speed for 5s.",
    abilityCooldown: 20,
    abilityDuration: 5,
    abilitySpeedBonus: 0.5,
    description: "Lightweight scout. Built for repositioning.",
  },
  {
    id: "chassis_crabber",
    name: "Crabber",
    category: "chassis",
    tier: 1,
    cost: 3500,
    weight: 3000,
    hp: 2500,
    armor: 10,
    size: [2.5, 1.0, 3.6],
    wheelBase: 2.9,
    abilityId: "personal_shield",
    abilityName: "Personal Shield",
    abilityDescription: "2,000 shield HP for 8s (or until broken). Then cooldown.",
    abilityCooldown: 25,
    abilityDuration: 8,
    abilityShieldHp: 2000,
    description: "Defensive chassis. Absorbs damage before HP.",
  },
  {
    id: "chassis_doomshock",
    name: "Doomshock",
    category: "chassis",
    tier: 2,
    cost: 9000,
    weight: 7500,
    hp: 5000,
    armor: 35,
    size: [3.0, 1.3, 4.6],
    wheelBase: 3.5,
    abilityId: "doomshock",
    abilityName: "Doomshock",
    abilityDescription: "15m shockwave push + 50% damage reduction for 5s.",
    abilityCooldown: 30,
    abilityDuration: 5,
    abilityRadius: 15,
    abilityDamageReduction: 0.5,
    description: "Heavy hull. Hold ground when surrounded.",
  },
  {
    id: "chassis_morrow",
    name: "Morrow",
    category: "chassis",
    tier: 2,
    cost: 8000,
    weight: 3500,
    hp: 3000,
    armor: 15,
    size: [2.6, 1.1, 3.8],
    wheelBase: 3.0,
    abilityId: "rejuvenation_field",
    abilityName: "Rejuvenation Field",
    abilityDescription: "10m field: +150 HP/s self, 100 DPS to enemies, 5s.",
    abilityCooldown: 30,
    abilityDuration: 5,
    abilityRadius: 10,
    abilityHealPerSec: 150,
    abilityDamagePerSec: 100,
    description: "Support chassis. Close-range heal and area damage.",
  },
  {
    id: "chassis_oblivion",
    name: "Oblivion",
    category: "chassis",
    tier: 3,
    cost: 14000,
    weight: 5000,
    hp: 3500,
    armor: 20,
    size: [2.8, 1.15, 4.2],
    wheelBase: 3.2,
    abilityId: "radar_jammer",
    abilityName: "Radar Jammer",
    abilityDescription: "Forward 90° / 20m from gun. Disables enemy weapons 5s.",
    abilityCooldown: 30,
    abilityDuration: 5,
    abilityRadius: 20,
    description: "Electronic warfare. Directional weapon denial.",
  },
];

// ---------- ENGINES (4) ----------
export const ENGINES: EnginePart[] = [
  {
    id: "engine_zephyr",
    name: "Zephyr",
    category: "engine",
    tier: 1,
    cost: 0,
    weight: 750,
    maxSpeed: 15,
    weightLimit: 6000,
    climbLimit: 8000,
    description: "High-speed starter. Struggles with heavy builds.",
  },
  {
    id: "engine_kestrel",
    name: "Kestrel",
    category: "engine",
    tier: 1,
    cost: 2000,
    weight: 1000,
    maxSpeed: 12,
    weightLimit: 8000,
    climbLimit: 11000,
    description: "Modest speed, better load capacity than Zephyr.",
  },
  {
    id: "engine_ironclad",
    name: "Ironclad",
    category: "engine",
    tier: 2,
    cost: 6000,
    weight: 2000,
    maxSpeed: 8,
    weightLimit: 16000,
    climbLimit: 22000,
    description: "Heavy-duty hauler. Best for Doomshock-class builds.",
  },
  {
    id: "engine_gravemotor",
    name: "Gravemotor",
    category: "engine",
    tier: 3,
    cost: 15000,
    weight: 1500,
    maxSpeed: 10,
    weightLimit: 14000,
    climbLimit: 18000,
    description: "Premium all-rounder. Speed and load in one package.",
  },
];

// ---------- WEAPONS (10) ----------
// fireRate used in combat = rpm / 60
export const WEAPONS: WeaponPart[] = [
  // Tier I
  {
    id: "weapon_rattlejack",
    name: "Rattlejack",
    category: "weapon",
    weaponType: "assault",
    tier: 1,
    cost: 0,
    weight: 1750,
    damage: 50,
    rpm: 450,
    magazine: 150,
    reload: 3,
    range: 40,
    projectileSpeed: 90,
    arc: 20,
    recoil: 400,
    description: "Fast assault cannon. Starter weapon.",
  },
  {
    id: "weapon_viper",
    name: "Viper",
    category: "weapon",
    weaponType: "assault",
    tier: 1,
    cost: 1500,
    weight: 1500,
    damage: 100,
    rpm: 300,
    magazine: 100,
    reload: 4,
    range: 50,
    projectileSpeed: 95,
    arc: 22,
    recoil: 600,
    description: "Reliable sustained automatic cannon.",
  },
  {
    id: "weapon_ironclast",
    name: "Ironclast",
    category: "weapon",
    weaponType: "cannon",
    tier: 1,
    cost: 2000,
    weight: 2500,
    damage: 800,
    rpm: 12,
    magazine: 1,
    reload: 5,
    range: 100,
    projectileSpeed: 70,
    arc: 25,
    recoil: 2800,
    description: "Heavy single shell. Travel time and drop.",
  },
  // Tier II
  {
    id: "weapon_craterfall",
    name: "Craterfall",
    category: "weapon",
    weaponType: "mortar",
    tier: 2,
    cost: 4500,
    weight: 2000,
    damage: 1000,
    rpm: 10,
    magazine: 1,
    reload: 6,
    range: 100,
    projectileSpeed: 45,
    arc: 55,
    recoil: 2200,
    splashDamage: 500,
    splashRadius: 8,
    description: "Arcing explosive. Direct + splash damage.",
  },
  {
    id: "weapon_ionthread",
    name: "Ionthread",
    category: "weapon",
    weaponType: "plasma",
    tier: 2,
    cost: 5000,
    weight: 1750,
    damage: 200,
    rpm: 150,
    magazine: 50,
    reload: 2,
    range: 150,
    projectileSpeed: 120,
    arc: 18,
    recoil: 350,
    description: "Long-range plasma. Fast reload.",
  },
  {
    id: "weapon_skyshatter",
    name: "Skyshatter",
    category: "weapon",
    weaponType: "mortar",
    tier: 2,
    cost: 5500,
    weight: 2500,
    damage: 500,
    rpm: 30,
    magazine: 4,
    reload: 5,
    range: 125,
    projectileSpeed: 50,
    arc: 50,
    recoil: 1600,
    splashDamage: 250,
    splashRadius: 6,
    volleyCount: 4,
    description: "Four-round explosive volley. Area coverage.",
  },
  {
    id: "weapon_starweft",
    name: "Starweft",
    category: "weapon",
    weaponType: "plasma",
    tier: 2,
    cost: 6000,
    weight: 2250,
    damage: 300,
    rpm: 100,
    magazine: 30,
    reload: 2,
    range: 200,
    projectileSpeed: 140,
    arc: 15,
    recoil: 500,
    description: "Precision plasma. Longer reach, slower fire.",
  },
  // Tier III
  {
    id: "weapon_arc_halo",
    name: "Arc Halo",
    category: "weapon",
    weaponType: "energy",
    tier: 3,
    cost: 12000,
    weight: 2000,
    damage: 500, // per second per target (base)
    rpm: 0,
    magazine: 0,
    reload: 4, // recharge time after full dump
    range: 75,
    projectileSpeed: 0,
    arc: 30,
    recoil: 0,
    isCharge: true,
    description: "Auto multi-target energy. Charge meter ammo.",
  },
  {
    id: "weapon_stonebreaker",
    name: "Stonebreaker",
    category: "weapon",
    weaponType: "cannon",
    tier: 3,
    cost: 11000,
    weight: 3000,
    damage: 1500,
    rpm: 10,
    magazine: 1,
    reload: 6,
    range: 150,
    projectileSpeed: 75,
    arc: 22,
    recoil: 3500,
    description: "Maximum single-hit tank cannon.",
  },
  {
    id: "weapon_ricochet",
    name: "Ricochet Cannon",
    category: "weapon",
    weaponType: "special",
    tier: 3,
    cost: 13000,
    weight: 2500,
    damage: 1000,
    rpm: 15,
    magazine: 2,
    reload: 4,
    range: 150,
    projectileSpeed: 80,
    arc: 20,
    recoil: 2400,
    isRicochet: true,
    description: "Shell bounces once. Hit around cover.",
  },
];

export const ALL_PARTS: AnyPart[] = [...CHASSIS, ...ENGINES, ...WEAPONS];

export function getPart<T extends AnyPart>(id: string): T | undefined {
  return ALL_PARTS.find((p) => p.id === id) as T | undefined;
}

/** Sustained DPS including reload downtime */
export function sustainedDps(w: WeaponPart): number {
  if (w.isCharge) return w.damage; // approx single-target while charged
  if (w.rpm <= 0) return 0;
  const rps = w.rpm / 60;
  const magTime = w.magazine / rps;
  const cycle = magTime + w.reload;
  const damagePerCycle = w.damage * w.magazine;
  return Math.round((damagePerCycle / cycle) * 10) / 10;
}

export function calculateStats(blueprint: TankBlueprint) {
  const chassis = getPart<ChassisPart>(blueprint.chassisId)!;
  const engine = getPart<EnginePart>(blueprint.engineId)!;
  const weapon = getPart<WeaponPart>(blueprint.weaponId)!;

  const totalWeight = chassis.weight + engine.weight + weapon.weight;

  // Soft speed penalty above weight limit (never hard-stops on flat ground)
  let speedFactor = 1;
  if (totalWeight > engine.weightLimit) {
    const over = totalWeight - engine.weightLimit;
    const span = Math.max(engine.climbLimit - engine.weightLimit, 1);
    speedFactor = Math.max(0.35, 1 - (over / span) * 0.65);
  }

  const topSpeed = Math.round(engine.maxSpeed * speedFactor * 10) / 10;
  const overweight = totalWeight > engine.weightLimit;
  const climbStrained = totalWeight > engine.climbLimit;

  // powerToWeight proxy for acceleration / climb feel in PlayerTank
  const powerToWeight =
    Math.round(((engine.maxSpeed * engine.weightLimit) / totalWeight) * 10) / 10;

  return {
    totalWeight,
    hp: chassis.hp,
    armor: chassis.armor,
    topSpeed,
    maxSpeedRated: engine.maxSpeed,
    weightLimit: engine.weightLimit,
    climbLimit: engine.climbLimit,
    overweight,
    climbStrained,
    powerToWeight,
    dps: sustainedDps(weapon),
    damage: weapon.damage,
    rpm: weapon.rpm,
    magazine: weapon.magazine,
    reload: weapon.reload,
    range: weapon.range,
    abilityName: chassis.abilityName,
    abilityCooldown: chassis.abilityCooldown,
    // legacy aliases used by current PlayerTank
    torque: engine.maxSpeed * 200,
    mass: totalWeight,
  };
}

/** Wave thresholds to unlock tiers (provisional, rewarding but not grindy) */
export const TIER_UNLOCK_WAVES: Record<number, number> = {
  1: 0,
  2: 3,
  3: 7,
};
