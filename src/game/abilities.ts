import * as THREE from "three";
import { ChassisPart } from "../data/parts";
import { damageEnemy, game, spawnEffect, useBattleStore } from "./battleState";

/**
 * Ability lifecycle:
 * Ready → Activate → Duration (locked) → Cooldown starts at full value → Ready
 * Returns duration seconds on success, -1 if blocked.
 */
export function activateAbility(chassis: ChassisPart, nowMs: number): number {
  const pl = game.player;
  const store = useBattleStore.getState();

  // Block if still active or still cooling down
  if (pl.abilityActive || store.abilityCd > 0 || !store.abilityReady) return -1;

  const id = chassis.abilityId;
  const durationSec = chassis.abilityDuration ?? 5;
  const durMs = durationSec * 1000;

  pl.abilityActive = true;
  pl.abilityCooldownSec = chassis.abilityCooldown;
  pl.pendingCooldown = false;

  switch (id) {
    case "afterburners": {
      pl.speedMul = 1 + (chassis.abilitySpeedBonus ?? 0.5);
      pl.abilityUntil = nowMs + durMs;
      store.setWarning("AFTERBURNERS");
      break;
    }
    case "doomshock": {
      const r = chassis.abilityRadius ?? 15;
      const origin = pl.pos;
      for (const e of game.enemies.values()) {
        if (e.dead) continue;
        const dx = e.pos.x - origin.x;
        const dz = e.pos.z - origin.z;
        const d = Math.hypot(dx, dz);
        if (d < r && d > 0.1) {
          const push = 10 * (1 - d / r);
          e.pos.x += (dx / d) * push;
          e.pos.z += (dz / d) * push;
        }
      }
      pl.damageReduction = chassis.abilityDamageReduction ?? 0.5;
      pl.abilityUntil = nowMs + durMs;
      spawnEffect(new THREE.Vector3(origin.x, origin.y + 1, origin.z), r * 0.35, 0.5);
      store.setWarning("DOOMSHOCK");
      break;
    }
    case "personal_shield": {
      const shp = chassis.abilityShieldHp ?? 2000;
      store.setShield(shp, shp);
      // Timed duration; also ends early if shield breaks
      pl.abilityUntil = nowMs + durMs;
      pl.shieldPendingCd = true;
      store.setWarning("SHIELD UP");
      break;
    }
    case "rejuvenation_field": {
      pl.fieldActive = true;
      pl.fieldRadius = chassis.abilityRadius ?? 10;
      pl.fieldHeal = chassis.abilityHealPerSec ?? 150;
      pl.fieldDps = chassis.abilityDamagePerSec ?? 100;
      pl.abilityUntil = nowMs + durMs;
      store.setWarning("REJUVENATION FIELD");
      break;
    }
    case "radar_jammer": {
      pl.jammerActive = true;
      pl.jammerRadius = chassis.abilityRadius ?? 20;
      pl.jammerHalfAngle = Math.PI / 4;
      pl.abilityUntil = nowMs + durMs;
      store.setWarning("RADAR JAMMER");
      break;
    }
  }

  // Not ready during duration
  store.setAbility(0, false);
  return durationSec;
}

function startCooldown(chassis: ChassisPart) {
  const pl = game.player;
  const store = useBattleStore.getState();
  pl.abilityActive = false;
  pl.speedMul = 1;
  pl.damageReduction = 0;
  pl.fieldActive = false;
  pl.jammerActive = false;
  pl.abilityUntil = 0;
  pl.shieldPendingCd = false;
  if (store.shieldHp > 0 || store.maxShieldHp > 0) {
    store.setShield(0, 0);
  }
  const cd = chassis.abilityCooldown;
  store.setAbility(cd, false);
  store.setWarning("ABILITY COOLDOWN");
}

/** Per-frame ability upkeep */
export function tickAbility(chassis: ChassisPart, dt: number, nowMs: number) {
  const pl = game.player;
  const store = useBattleStore.getState();

  // Tick cooldown only when not active
  if (!pl.abilityActive && store.abilityCd > 0) {
    const cd = Math.max(0, store.abilityCd - dt);
    store.setAbility(cd, cd <= 0);
    if (cd <= 0) store.setWarning("");
  }

  // Timed abilities end → start cooldown
  if (pl.abilityActive && pl.abilityUntil > 0 && nowMs >= pl.abilityUntil) {
    startCooldown(chassis);
  }

  // Shield break → start cooldown
  if (
    pl.abilityActive &&
    chassis.abilityId === "personal_shield" &&
    pl.shieldPendingCd &&
    store.maxShieldHp > 0 &&
    store.shieldHp <= 0
  ) {
    pl.shieldPendingCd = false;
    store.setShield(0, 0);
    startCooldown(chassis);
    store.setWarning("SHIELD BROKEN");
  }

  // Field tick
  if (pl.fieldActive) {
    if (store.hp < store.maxHp) {
      const heal = pl.fieldHeal * dt;
      useBattleStore.setState({ hp: Math.min(store.maxHp, store.hp + heal) });
    }
    for (const e of game.enemies.values()) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      if (d <= pl.fieldRadius) damageEnemy(e, pl.fieldDps * dt);
    }
  }

  // Jammer cone
  if (pl.jammerActive) {
    const aim = pl.yaw + pl.turretYaw;
    const fx = -Math.sin(aim);
    const fz = -Math.cos(aim);
    for (const e of game.enemies.values()) {
      if (e.dead) {
        e.jammed = false;
        continue;
      }
      const dx = e.pos.x - pl.pos.x;
      const dz = e.pos.z - pl.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > pl.jammerRadius || d < 0.01) {
        e.jammed = false;
        continue;
      }
      const dot = (dx / d) * fx + (dz / d) * fz;
      const ang = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));
      e.jammed = ang <= pl.jammerHalfAngle;
    }
  } else {
    for (const e of game.enemies.values()) e.jammed = false;
  }
}
