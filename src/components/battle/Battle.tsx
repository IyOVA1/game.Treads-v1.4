import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useTankStore } from "../../store/tankStore";
import { getPart, WeaponPart } from "../../data/parts";
import { game, resetGame, useBattleStore } from "../../game/battleState";
import { Terrain } from "./Terrain";
import { PlayerTank } from "../tank/PlayerTank";
import { EnemySpawner } from "./EnemySpawner";
import { Systems } from "./Systems";
import { HUD } from "../ui/HUD";
import "./Battle.css";

const keyMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "ability", keys: ["Space"] },
];

function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = game.player.pos;
    l.position.set(p.x + 40, p.y + 60, p.z + 25);
    l.target.position.set(p.x, p.y, p.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      intensity={1.4}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-near={1}
      shadow-camera-far={220}
      shadow-camera-left={-70}
      shadow-camera-right={70}
      shadow-camera-top={70}
      shadow-camera-bottom={-70}
    />
  );
}

export function Battle() {
  const weapon = getPart<WeaponPart>(useTankStore.getState().blueprint.weaponId)!;
  const mag = weapon.magazine > 0 ? weapon.magazine : 999;

  useState(() => {
    resetGame();
    useBattleStore.getState().reset(useTankStore.getState().stats.hp, mag);
    return true;
  });

  const returnToGarage = useTankStore((s) => s.returnToGarage);
  const hp = useBattleStore((s) => s.hp);
  const maxHp = useBattleStore((s) => s.maxHp);
  const kills = useBattleStore((s) => s.kills);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync so event handlers never need [paused] as a dependency
  pausedRef.current = paused;
  game.paused = paused;

  useEffect(() => {
    const blockSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setPaused((p) => {
        const next = !p;
        pausedRef.current = next;
        game.paused = next;
        if (next) {
          document.exitPointerLock?.();
          game.input.fire = false;
        }
        return next;
      });
    };
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        if (!pausedRef.current) game.input.fire = true;
      }
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) game.input.fire = false;
    };
    const onContext = (e: Event) => e.preventDefault();
    const onClick = () => {
      if (!pausedRef.current && shellRef.current && document.pointerLockElement == null) {
        shellRef.current.requestPointerLock();
      }
    };

    window.addEventListener("keydown", blockSpace);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("click", onClick);

    // Cleanup ONLY when leaving battle (unmount) — not on pause toggle
    return () => {
      window.removeEventListener("keydown", blockSpace);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("click", onClick);
      document.exitPointerLock?.();
      game.input.fire = false;
      game.paused = false;
      useTankStore.getState().persist();
      resetGame();
    };
  }, []);

  return (
    <div className="battle" ref={shellRef}>
      <KeyboardControls map={keyMap}>
        <Canvas shadows camera={{ position: [0, 12, 18], fov: 55, near: 0.5, far: 900 }}>
          <color attach="background" args={["#0c4a6e"]} />
          <fog attach="fog" args={["#0c4a6e", 80, 320]} />
          <ambientLight intensity={0.45} />
          <Sun />
          <Suspense fallback={null}>
            <Terrain />
            <PlayerTank />
            <EnemySpawner />
            <Systems />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <div className="crosshair" />

      <HUD score={kills} hp={hp} maxHp={maxHp} onQuit={returnToGarage} />

      {paused && (
        <div className="pause-menu">
          <h2>Paused</h2>
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              game.paused = false;
              shellRef.current?.requestPointerLock();
            }}
          >
            Resume
          </button>
          <button type="button" onClick={returnToGarage}>
            Return to Arsenal
          </button>
        </div>
      )}

      {hp <= 0 && (
        <div className="game-over">
          <h2>Destroyed!</h2>
          <p>Enemies destroyed: {kills}</p>
          <p>Wave reached: {useBattleStore.getState().wave}</p>
          <button type="button" onClick={returnToGarage}>
            Return to Arsenal
          </button>
        </div>
      )}
    </div>
  );
}
