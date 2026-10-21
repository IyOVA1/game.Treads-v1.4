import { create } from "zustand";
import * as THREE from "three";
import { useTankStore } from "../store/tankStore";

// ---------- React-facing state (HUD) ----------
interface BattleState {
  hp: number;
  maxHp: number;
  kills: number;
  wave: number;
  waveEnemiesLeft: number;
  waveClearing: boolean; // brief pause between waves
  ammo: number;
  magSize: number;
  reloading: boolean;
  reloadProgress: number; // 0..1
  abilityCd: number; // seconds remaining
  abilityReady: boolean;
  shieldHp: number;
  maxShieldHp: number;
  warning: string;
  reset: (maxHp: number, magSize: number) => void;
  damagePlayer: (amount: number) => void;
  addKill: () => void;
  setWave: (wave: number, enemiesLeft: number) => void;
  setWaveEnemiesLeft: (n: number) => void;
  setWaveClearing: (v: boolean) => void;
  setAmmo: (ammo: number, reloading: boolean, reloadProgress: number) => void;
  setAbility: (cd: number, ready: boolean) => void;
  setShield: (hp: number, max: number) => void;
  setWarning: (msg: string) => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  hp: 100,
  maxHp: 100,
  kills: 0,
  wave: 1,
  waveEnemiesLeft: 0,
  waveClearing: false,
  ammo: 0,
  magSize: 0,
  reloading: false,
  reloadProgress: 0,
  abilityCd: 0,
  abilityReady: true,
  shieldHp: 0,
  maxShieldHp: 0,
  warning: "",
  reset: (maxHp, magSize) =>
    set({
      hp: maxHp,
      maxHp,
      kills: 0,
      wave: 1,
      waveEnemiesLeft: 0,
      waveClearing: false,
      ammo: magSize,
      magSize,
      reloading: false,
      reloadProgress: 0,
      abilityCd: 0,
      abilityReady: true,
      shieldHp: 0,
      maxShieldHp: 0,
      warning: "",
    }),
  damagePlayer: (amount) =>
    set((s) => {
      // Shield absorbs first
      if (s.shieldHp > 0) {
        const absorbed = Math.min(s.shieldHp, amount);
        const remain = amount - absorbed;
        const newShield = s.shieldHp - absorbed;
        if (remain <= 0) return { shieldHp: newShield };
        return { shieldHp: newShield, hp: Math.max(0, s.hp - remain) };
      }
      // Damage reduction from active ability (stored on game.player)
      const dr = game.player.damageReduction;
      const dealt = amount * (1 - dr);
      return { hp: Math.max(0, s.hp - dealt) };
    }),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  setWave: (wave, waveEnemiesLeft) => set({ wave, waveEnemiesLeft }),
  setWaveEnemiesLeft: (waveEnemiesLeft) => set({ waveEnemiesLeft }),
  setWaveClearing: (waveClearing) => set({ waveClearing }),
  setAmmo: (ammo, reloading, reloadProgress) => set({ ammo, reloading, reloadProgress }),
  setAbility: (abilityCd, abilityReady) => set({ abilityCd, abilityReady }),
  setShield: (shieldHp, maxShieldHp) => set({ shieldHp, maxShieldHp }),
  setWarning: (warning) => set({ warning }),
}));

// ---------- Fast mutable state ----------
export interface EnemyState {
  id: number;
  pos: THREE.Vector3;
  hp: number;
  maxHp: number;
  radius: number;
  dead: boolean;
  jammed: boolean; // Radar Jammer
  archetype: string;
}

export interface Projectile {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  owner: "player" | "enemy";
  life: number;
  splash: number;
  ballistic?: boolean; // if true, apply gravity
}

export interface Effect {
  pos: THREE.Vector3;
  age: number;
  life: number;
  size: number;
}

export const game = {
  paused: false,
  player: {
    pos: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    turretYaw: 0, // relative to hull
    pitch: 0,
    radius: 2.2,
    speed: 0,
    alive: true,
    // ability runtime
    speedMul: 1,
    damageReduction: 0,
    abilityUntil: 0, // performance.now() ms
    fieldActive: false,
    fieldRadius: 0,
    fieldHeal: 0,
    fieldDps: 0,
    jammerActive: false,
    jammerRadius: 0,
    jammerHalfAngle: Math.PI / 4,
    abilityActive: false,
    abilityCooldownSec: 0,
    shieldPendingCd: false,
  },
  input: {
    fire: false, // RMB held
    ability: false,
    mouseX: 0,
    mouseY: 0,
  },
  enemies: new Map<number, EnemyState>(),
  projectiles: [] as Projectile[],
  effects: [] as Effect[],
};

export const GRAVITY = 9.8;
export const MAX_PROJECTILES = 128;
export const MAX_EFFECTS = 96;

export function resetGame() {
  game.paused = false;
  game.player.pos.set(0, 0, 0);
  game.player.yaw = 0;
  game.player.turretYaw = 0;
  game.player.pitch = 0;
  game.player.speed = 0;
  game.player.alive = true;
  game.player.speedMul = 1;
  game.player.damageReduction = 0;
  game.player.abilityUntil = 0;
  game.player.fieldActive = false;
  game.player.jammerActive = false;
  game.player.abilityActive = false;
  game.player.abilityCooldownSec = 0;
  game.player.shieldPendingCd = false;
  game.input.fire = false;
  game.input.ability = false;
  game.input.mouseX = 0;
  game.input.mouseY = 0;
  game.enemies.clear();
  game.projectiles.length = 0;
  game.effects.length = 0;
}

export function spawnEffect(pos: THREE.Vector3, size: number, life = 0.45) {
  if (game.effects.length >= MAX_EFFECTS) game.effects.shift();
  game.effects.push({ pos: pos.clone(), age: 0, life, size });
}

export function spawnProjectile(p: Projectile) {
  if (game.projectiles.length >= MAX_PROJECTILES) game.projectiles.shift();
  game.projectiles.push(p);
}

export function aimWithDrop(
  from: THREE.Vector3,
  to: THREE.Vector3,
  speed: number,
  out: THREE.Vector3
) {
  out.copy(to).sub(from);
  const dist = out.length();
  const t = dist / speed;
  out.y += 0.5 * GRAVITY * t * t;
  return out.normalize();
}

export function damageEnemy(e: EnemyState, amount: number) {
  if (e.dead) return;
  e.hp -= amount;
  if (e.hp <= 0) {
    e.dead = true;
    useBattleStore.getState().addKill();
    useTankStore.getState().addCoins(200 + Math.floor(Math.random() * 150));
  }
}

/** Enemies per wave — grows, soft cap */
export function enemiesForWave(wave: number): number {
  return Math.min(14, 3 + Math.floor((wave - 1) * 1.5));
}
