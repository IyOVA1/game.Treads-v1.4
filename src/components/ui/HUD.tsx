import { useTankStore } from "../../store/tankStore";
import { useBattleStore } from "../../game/battleState";
import "./HUD.css";

interface Props {
  score: number;
  hp: number;
  maxHp?: number;
  onQuit: () => void;
}

export function HUD({ score, hp, maxHp = 100, onQuit }: Props) {
  const coins = useTankStore((s) => s.coins);
  const wave = useBattleStore((s) => s.wave);
  const left = useBattleStore((s) => s.waveEnemiesLeft);
  const clearing = useBattleStore((s) => s.waveClearing);
  const ammo = useBattleStore((s) => s.ammo);
  const mag = useBattleStore((s) => s.magSize);
  const reloading = useBattleStore((s) => s.reloading);
  const reloadProgress = useBattleStore((s) => s.reloadProgress);
  const abilityCd = useBattleStore((s) => s.abilityCd);
  const abilityReady = useBattleStore((s) => s.abilityReady);
  const shieldHp = useBattleStore((s) => s.shieldHp);
  const maxShield = useBattleStore((s) => s.maxShieldHp);
  const warning = useBattleStore((s) => s.warning);
  const abilityName = useTankStore((s) => s.stats.abilityName);

  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-chip">
          <span className="ico" aria-hidden>🌊</span>
          <div>
            <span className="lbl">WAVE</span>
            <strong>{wave}{clearing ? "…" : ""}</strong>
          </div>
        </div>
        <div className="hud-chip">
          <span className="ico" aria-hidden>🎯</span>
          <div>
            <span className="lbl">HOSTILES</span>
            <strong>{left}</strong>
          </div>
        </div>
        <div className="hud-chip">
          <span className="ico" aria-hidden>☠</span>
          <div>
            <span className="lbl">KILLS</span>
            <strong>{score}</strong>
          </div>
        </div>
        <div className="hud-chip gold">
          <span className="ico" aria-hidden>🪙</span>
          <div>
            <span className="lbl">CREDITS</span>
            <strong>{coins}</strong>
          </div>
        </div>
        <button className="quit-btn" onClick={onQuit} type="button">
          ☰ Arsenal
        </button>
      </div>

      {warning && <div className="hud-warning">⚠ {warning}</div>}

      <div className="hud-bottom">
        {maxShield > 0 && shieldHp > 0 && (
          <div className="bar shield">
            <div className="bar-fill" style={{ width: `${(shieldHp / maxShield) * 100}%` }} />
            <span>🛡 {Math.round(shieldHp)}</span>
          </div>
        )}

        <div className="bar hp">
          <div
            className="bar-fill"
            style={{
              width: `${hpPct}%`,
              background:
                hpPct > 50
                  ? "linear-gradient(90deg,#16a34a,#4ade80)"
                  : hpPct > 25
                    ? "linear-gradient(90deg,#ca8a04,#facc15)"
                    : "linear-gradient(90deg,#b91c1c,#f87171)",
            }}
          />
          <span>❤ {Math.round(hp)} / {maxHp}</span>
        </div>

        <div className="hud-combat-row">
          <div className={`pill ammo ${reloading ? "busy" : ""}`}>
            <span className="ico">⬡</span>
            {reloading ? (
              <span>RELOAD {Math.round(reloadProgress * 100)}%</span>
            ) : (
              <span>
                {ammo}
                <small> / {mag >= 900 ? "∞" : mag}</small>
              </span>
            )}
          </div>

          <div className={`pill ability ${abilityReady ? "ready" : ""}`}>
            <span className="ico">⚡</span>
            <span>
              {abilityName}{" "}
              {abilityReady ? (
                <small className="go">SPACE</small>
              ) : (
                <small>{abilityCd.toFixed(1)}s</small>
              )}
            </span>
          </div>
        </div>

        <div className="controls-hint">
          WASD move · Mouse aim · RMB fire · Space ability · Esc pause
        </div>
      </div>
    </div>
  );
}
