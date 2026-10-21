import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useState } from "react";
import { useTankStore } from "../../store/tankStore";
import { useAccountStore } from "../../store/accountStore";
import { CHASSIS, ENGINES, WEAPONS, getPart } from "../../data/parts";
import { TankPreview } from "../tank/TankPreview";
import { PartPicker } from "./PartPicker";
import { StatsPanel } from "./StatsPanel";
import "./Garage.css";

type Tab = "chassis" | "engine" | "weapon";

export function Garage() {
  const { blueprint, coins, startBattle, stats, persist, unlockedTier, highestWave } =
    useTankStore();
  const displayName = useAccountStore((s) => s.displayName);
  const isGuest = useAccountStore((s) => s.isGuest);
  const logout = useAccountStore((s) => s.logout);
  const [tab, setTab] = useState<Tab>("chassis");

  const parts =
    tab === "chassis" ? CHASSIS : tab === "engine" ? ENGINES : WEAPONS;
  const selectedId =
    tab === "chassis"
      ? blueprint.chassisId
      : tab === "engine"
        ? blueprint.engineId
        : blueprint.weaponId;

  return (
    <div className="garage">
      <header className="garage-top">
        <div className="brand">
          <h1>The Arsenal</h1>
          <span className="tier-pill">Tier {unlockedTier} unlocked</span>
          <span className="wave-pill">Best wave {highestWave}</span>
        </div>
        <div className="top-right">
          <div className="coins">🪙 {coins}</div>
          <div className="account-line">
            <span>{displayName || (isGuest ? "Guest" : "Pilot")}</span>
            <button
              type="button"
              className="logout-btn"
              onClick={() => {
                persist();
                logout();
              }}
            >
              {isGuest ? "Account" : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <div className="garage-body">
        <aside className="garage-sidebar">
          <nav className="part-tabs">
            {(
              [
                ["chassis", "Chassis"],
                ["engine", "Engine"],
                ["weapon", "Weapon"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <PartPicker
            title={tab === "chassis" ? "Chassis" : tab === "engine" ? "Engines" : "Weapons"}
            parts={parts}
            selectedId={selectedId}
            category={tab}
          />

          <StatsPanel stats={stats} />

          <button className="start-btn" type="button" onClick={startBattle}>
            ▶ Enter Battle
          </button>
        </aside>

        <div className="preview-area">
          <Canvas shadows camera={{ position: [6, 4, 8], fov: 45 }}>
            <color attach="background" args={["#0f172a"]} />
            <ambientLight intensity={0.45} />
            <directionalLight
              position={[10, 15, 8]}
              intensity={1.25}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <Suspense fallback={null}>
              <TankPreview blueprint={blueprint} />
              <ContactShadows
                position={[0, -0.01, 0]}
                opacity={0.5}
                scale={12}
                blur={2}
              />
              <Environment preset="warehouse" />
            </Suspense>
            <OrbitControls
              target={[0, 0.8, 0]}
              maxPolarAngle={Math.PI / 2.1}
              minDistance={4}
              maxDistance={14}
            />
            <gridHelper args={[20, 20, "#334155", "#1e293b"]} position={[0, -0.01, 0]} />
          </Canvas>
          <div className="preview-label">
            {getPart(blueprint.chassisId)?.name} · {getPart(blueprint.engineId)?.name} ·{" "}
            {getPart(blueprint.weaponId)?.name}
          </div>
        </div>
      </div>
    </div>
  );
}
