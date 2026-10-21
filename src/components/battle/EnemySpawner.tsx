import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  aimWithDrop,
  enemiesForWave,
  EnemyState,
  game,
  spawnEffect,
  spawnProjectile,
  useBattleStore,
} from "../../game/battleState";
import { useTankStore } from "../../store/tankStore";
import { MAP_LIMIT, sampleHull, slopeAlong, terrainHeight } from "../../game/terrain";

type Archetype = "grunt" | "heavy" | "arty" | "scout";

interface EnemySpawn {
  id: number;
  x: number;
  z: number;
  maxHp: number;
  archetype: Archetype;
}

const ARCH: Record<
  Archetype,
  { speed: number; damage: number; shellSpeed: number; fireCd: number; color: string; hpMul: number }
> = {
  grunt: { speed: 7, damage: 90, shellSpeed: 55, fireCd: 2.2, color: "#7f1d1d", hpMul: 1 },
  heavy: { speed: 4.5, damage: 180, shellSpeed: 50, fireCd: 3.5, color: "#3f1a1a", hpMul: 1.6 },
  arty: { speed: 5, damage: 140, shellSpeed: 35, fireCd: 4.0, color: "#5c3d1e", hpMul: 0.9 },
  scout: { speed: 9, damage: 55, shellSpeed: 65, fireCd: 1.6, color: "#991b1b", hpMul: 0.7 },
};

function pickArchetype(wave: number): Archetype {
  const r = Math.random();
  if (wave <= 2) return r < 0.85 ? "grunt" : "scout";
  if (wave <= 4) {
    if (r < 0.5) return "grunt";
    if (r < 0.75) return "scout";
    if (r < 0.9) return "heavy";
    return "arty";
  }
  if (r < 0.35) return "grunt";
  if (r < 0.55) return "scout";
  if (r < 0.8) return "heavy";
  return "arty";
}

const clampMap = (v: number) => THREE.MathUtils.clamp(v, -MAP_LIMIT, MAP_LIMIT);

function randomSpawn(
  id: number,
  cx: number,
  cz: number,
  minD: number,
  maxD: number,
  wave: number
): EnemySpawn {
  const angle = Math.random() * Math.PI * 2;
  const dist = minD + Math.random() * (maxD - minD);
  const arch = pickArchetype(wave);
  const base = 800 + Math.random() * 400;
  const scale = 1 + wave * 0.08;
  return {
    id,
    x: clampMap(cx + Math.cos(angle) * dist),
    z: clampMap(cz + Math.sin(angle) * dist),
    maxHp: Math.round(base * ARCH[arch].hpMul * scale),
    archetype: arch,
  };
}

export function EnemySpawner() {
  const [enemies, setEnemies] = useState<EnemySpawn[]>([]);
  const nextId = useRef(1);
  const wave = useRef(1);
  const between = useRef(true);
  const betweenT = useRef(2); // start first wave after 2s
  const spawnedForWave = useRef(0);
  const need = useRef(enemiesForWave(1));
  const enemyCountRef = useRef(0);

  enemyCountRef.current = enemies.length;

  useFrame((_, delta) => {
    if (game.paused) return;
    const dt = Math.min(delta, 0.05);
    if (!game.player.alive) return;

    // Count living enemies registered in game map
    let living = 0;
    for (const e of game.enemies.values()) if (!e.dead) living++;

    if (between.current) {
      useBattleStore.getState().setWaveClearing(true);
      betweenT.current -= dt;
      if (betweenT.current <= 0) {
        between.current = false;
        spawnedForWave.current = 0;
        need.current = enemiesForWave(wave.current);
        useBattleStore.getState().setWave(wave.current, need.current);
        useBattleStore.getState().setWaveClearing(false);
        useBattleStore.getState().setWarning(`WAVE ${wave.current}`);
      }
      return;
    }

    // Spawn remaining for this wave (stagger)
    if (spawnedForWave.current < need.current && living < 10) {
      const p = game.player.pos;
      const spawn = randomSpawn(nextId.current++, p.x, p.z, 80, 130, wave.current);
      setEnemies((prev) => [...prev, spawn]);
      spawnedForWave.current++;
      useBattleStore
        .getState()
        .setWaveEnemiesLeft(need.current - spawnedForWave.current + living);
    }

    // Wave clear: must have finished spawning AND no living enemies in the map
    // (guards against false clear if the enemy map was wiped by a bug/reset)
    const stillSpawning = spawnedForWave.current < need.current;
    if (
      !stillSpawning &&
      need.current > 0 &&
      spawnedForWave.current >= need.current &&
      living === 0 &&
      enemyCountRef.current === 0
    ) {
      useTankStore.getState().reportWave(wave.current);
      const cleared = wave.current;
      wave.current += 1;
      between.current = true;
      betweenT.current = 4;
      setEnemies([]);
      useBattleStore.getState().setWarning("WAVE " + cleared + " CLEARED");
    } else {
      useBattleStore
        .getState()
        .setWaveEnemiesLeft(living + Math.max(0, need.current - spawnedForWave.current));
    }
  });

  return (
    <>
      {enemies.map((e) => (
        <EnemyTank
          key={e.id}
          spawn={e}
          onGone={() => setEnemies((prev) => prev.filter((x) => x.id !== e.id))}
        />
      ))}
    </>
  );
}

const PREFERRED_MAX = 30;
const PREFERRED_MIN = 18;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function EnemyTank({ spawn, onGone }: { spawn: EnemySpawn; onGone: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Object3D>(null);
  const hullMat = useRef<THREE.MeshStandardMaterial>(null);
  const arch = ARCH[spawn.archetype];

  const state = useMemo<EnemyState>(
    () => ({
      id: spawn.id,
      pos: new THREE.Vector3(spawn.x, terrainHeight(spawn.x, spawn.z), spawn.z),
      hp: spawn.maxHp,
      maxHp: spawn.maxHp,
      radius: 2.3,
      dead: false,
      jammed: false,
      archetype: spawn.archetype,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const yaw = useRef(Math.random() * Math.PI * 2);
  const speed = useRef(0);
  const cooldown = useRef(1.5 + Math.random() * 2);
  const goneSent = useRef(false);

  const tmp = useRef({
    target: new THREE.Quaternion(),
    yawQ: new THREE.Quaternion(),
    local: new THREE.Quaternion(),
    tilt: new THREE.Quaternion(),
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  }).current;

  useEffect(() => {
    game.enemies.set(spawn.id, state);
    return () => {
      game.enemies.delete(spawn.id);
    };
  }, [spawn.id, state]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (game.paused) return;
    const dt = Math.min(delta, 0.05);

    if (state.dead) {
      if (!goneSent.current) {
        goneSent.current = true;
        spawnEffect(tmp.from.set(state.pos.x, state.pos.y + 1, state.pos.z), 3.5, 0.8);
        onGone();
      }
      return;
    }

    const pl = game.player;
    const dx = pl.pos.x - state.pos.x;
    const dz = pl.pos.z - state.pos.z;
    const dist = Math.hypot(dx, dz);

    if (pl.alive) {
      const desired = Math.atan2(-dx, -dz);
      let diff = wrapAngle(desired - yaw.current);
      yaw.current += THREE.MathUtils.clamp(diff, -0.9 * dt, 0.9 * dt);

      const uphill = Math.max(0, slopeAlong(state.pos.x, state.pos.z, yaw.current));
      const slopeFactor = THREE.MathUtils.clamp(1 - uphill * 2.5, 0.3, 1);
      let target = 0;
      if (dist > PREFERRED_MAX) target = arch.speed * slopeFactor;
      else if (dist < PREFERRED_MIN) target = -arch.speed * 0.4;
      speed.current =
        speed.current < target
          ? Math.min(speed.current + 3 * dt, target)
          : Math.max(speed.current - 6 * dt, target);
    } else {
      speed.current = Math.max(0, speed.current - 6 * dt);
    }

    state.pos.x += -Math.sin(yaw.current) * speed.current * dt;
    state.pos.z += -Math.cos(yaw.current) * speed.current * dt;
    state.pos.x = THREE.MathUtils.clamp(state.pos.x, -MAP_LIMIT, MAP_LIMIT);
    state.pos.z = THREE.MathUtils.clamp(state.pos.z, -MAP_LIMIT, MAP_LIMIT);
    state.pos.y = sampleHull(state.pos.x, state.pos.z, yaw.current, 2.4, 3.6, tmp.target);

    tmp.yawQ.setFromAxisAngle(Y_AXIS, yaw.current);
    tmp.local.copy(tmp.yawQ).invert().multiply(tmp.target);
    tmp.tilt.slerp(tmp.local, 1 - Math.exp(-8 * dt));
    g.quaternion.copy(tmp.yawQ).multiply(tmp.tilt);
    g.position.set(state.pos.x, state.pos.y + 0.55, state.pos.z);

    // Fire (blocked if jammed)
    cooldown.current -= dt;
    if (
      pl.alive &&
      !state.jammed &&
      dist < 75 &&
      cooldown.current <= 0 &&
      muzzleRef.current
    ) {
      cooldown.current = arch.fireCd * (0.85 + Math.random() * 0.3);
      muzzleRef.current.getWorldPosition(tmp.from);

      // Aim skill scales with wave: early waves miss more, later waves lead better
      const wave = useBattleStore.getState().wave;
      const skill = Math.min(1, 0.25 + wave * 0.08); // ~0.33 at w1 → ~1 by w10
      const lead = (dist / Math.max(20, arch.shellSpeed)) * skill;
      const spread = (1 - skill) * 6; // meters of random miss early on

      tmp.to.set(
        pl.pos.x + (-Math.sin(pl.yaw) * pl.speed) * lead + (Math.random() - 0.5) * spread,
        pl.pos.y + 1.2,
        pl.pos.z + (-Math.cos(pl.yaw) * pl.speed) * lead + (Math.random() - 0.5) * spread
      );
      aimWithDrop(tmp.from, tmp.to, arch.shellSpeed, tmp.dir);
      spawnProjectile({
        pos: tmp.from.clone(),
        vel: tmp.dir.multiplyScalar(arch.shellSpeed),
        damage: arch.damage,
        owner: "enemy",
        life: 4,
        splash: 1.2,
        ballistic: true,
      });
    }

    if (hullMat.current) {
      const t = 1 - Math.max(0, state.hp) / state.maxHp;
      hullMat.current.color.set(arch.color).lerp(new THREE.Color("#ef4444"), t * 0.6);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <boxGeometry args={[2.4, 1.0, 3.6]} />
        <meshStandardMaterial ref={hullMat} color={arch.color} metalness={0.35} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.7, -0.15]} castShadow>
        <cylinderGeometry args={[0.55, 0.7, 0.4, 6]} />
        <meshStandardMaterial color="#1c1010" />
      </mesh>
      <mesh position={[0, 0.75, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 1.8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <object3D ref={muzzleRef} position={[0, 0.75, 2.1]} />
    </group>
  );
}
