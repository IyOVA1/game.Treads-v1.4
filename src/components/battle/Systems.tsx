import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  game,
  GRAVITY,
  MAX_EFFECTS,
  MAX_PROJECTILES,
  damageEnemy,
  spawnEffect,
  useBattleStore,
} from "../../game/battleState";
import { terrainHeight } from "../../game/terrain";

// Is point p inside the "box" around a tank standing at base?
function hitsTank(p: THREE.Vector3, base: THREE.Vector3, radius: number) {
  const dx = p.x - base.x;
  const dz = p.z - base.z;
  return dx * dx + dz * dz < radius * radius && p.y > base.y - 0.4 && p.y < base.y + 2.4;
}

const dummy = new THREE.Object3D();

// Moves every shell, checks what it hit, and draws shells and explosions.
// Shells are NOT physics bodies, so they can never push a tank around.
export function Systems() {
  const shellMesh = useRef<THREE.InstancedMesh>(null);
  const fxMesh = useRef<THREE.InstancedMesh>(null);

  useFrame((_, delta) => {
    if (game.paused) return;
    const dt = Math.min(delta, 0.05);
    const shots = game.projectiles;

    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.life -= dt;
      if (p.life <= 0) {
        shots.splice(i, 1);
        continue;
      }
      if (p.ballistic) p.vel.y -= GRAVITY * dt;

      // Fast shells move in small sub-steps so they can't skip through a tank
      const steps = Math.max(1, Math.ceil((p.vel.length() * dt) / 1.0));
      const sdt = dt / steps;
      let hit = false;

      for (let s = 0; s < steps && !hit; s++) {
        p.pos.addScaledVector(p.vel, sdt);

        if (p.pos.y < terrainHeight(p.pos.x, p.pos.z)) {
          hit = true;
        } else if (p.owner === "player") {
          for (const e of game.enemies.values()) {
            if (!e.dead && hitsTank(p.pos, e.pos, e.radius)) {
              damageEnemy(e, p.damage);
              hit = true;
              break;
            }
          }
        } else if (game.player.alive && hitsTank(p.pos, game.player.pos, game.player.radius)) {
          useBattleStore.getState().damagePlayer(p.damage);
          hit = true;
        }
      }

      if (hit) {
        spawnEffect(p.pos, p.splash);
        shots.splice(i, 1);
      }
    }

    // Separate player from enemies (no ghosting through)
    const pl = game.player;
    if (pl.alive) {
      for (const e of game.enemies.values()) {
        if (e.dead) continue;
        const dx = pl.pos.x - e.pos.x;
        const dz = pl.pos.z - e.pos.z;
        const dist = Math.hypot(dx, dz);
        const minD = pl.radius + e.radius;
        if (dist < minD && dist > 1e-4) {
          const push = (minD - dist) * 0.55;
          const nx = dx / dist;
          const nz = dz / dist;
          pl.pos.x += nx * push;
          pl.pos.z += nz * push;
          e.pos.x -= nx * push * 0.35;
          e.pos.z -= nz * push * 0.35;
        } else if (dist <= 1e-4) {
          pl.pos.x += minD * 0.5;
        }
      }
    }

    // Draw shells
    const sm = shellMesh.current;
    if (sm) {
      for (let i = 0; i < shots.length; i++) {
        dummy.position.copy(shots[i].pos);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      }
      sm.count = shots.length;
      sm.instanceMatrix.needsUpdate = true;
    }

    // Update and draw explosions / muzzle flashes
    const fx = game.effects;
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].age += dt;
      if (fx[i].age >= fx[i].life) fx.splice(i, 1);
    }
    const fm = fxMesh.current;
    if (fm) {
      for (let i = 0; i < fx.length; i++) {
        const t = fx[i].age / fx[i].life;
        dummy.position.copy(fx[i].pos);
        dummy.scale.setScalar(fx[i].size * (0.3 + Math.sin(Math.min(1, t) * Math.PI)));
        dummy.updateMatrix();
        fm.setMatrixAt(i, dummy.matrix);
      }
      fm.count = fx.length;
      fm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={shellMesh}
        args={[undefined, undefined, MAX_PROJECTILES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#fde047" />
      </instancedMesh>
      <instancedMesh ref={fxMesh} args={[undefined, undefined, MAX_EFFECTS]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#fb923c" />
      </instancedMesh>
    </>
  );
}
