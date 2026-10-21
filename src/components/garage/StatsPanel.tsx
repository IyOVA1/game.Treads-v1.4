import "./StatsPanel.css";

interface Stats {
  totalWeight: number;
  hp: number;
  armor: number;
  topSpeed: number;
  maxSpeedRated: number;
  dps: number;
  damage: number;
  rpm: number;
  overweight: boolean;
  climbStrained: boolean;
  abilityName: string;
  abilityCooldown: number;
  weightLimit: number;
}

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section className="stats-panel">
      <h2>Tank Sheet</h2>
      <div className="stats-grid">
        <Stat label="HP" value={`${stats.hp}`} />
        <Stat label="Armor" value={`${stats.armor}`} />
        <Stat label="DMG" value={`${stats.damage}`} />
        <Stat label="RPM" value={stats.rpm > 0 ? `${stats.rpm}` : "—"} />
        <Stat label="DPS" value={`${stats.dps}`} />
        <Stat
          label="Speed"
          value={`${stats.topSpeed}${stats.overweight ? " ⚠" : ""}`}
        />
        <Stat label="Weight" value={`${stats.totalWeight} kg`} />
        <Stat label="Limit" value={`${stats.weightLimit} kg`} />
      </div>
      <div className="ability-line">
        <span className="stat-label">Ability</span>
        <span className="stat-value">
          {stats.abilityName} · {stats.abilityCooldown}s
        </span>
      </div>
      {stats.overweight && (
        <p className="warn">Over weight limit — top speed reduced</p>
      )}
      {stats.climbStrained && (
        <p className="warn">Over climb limit — steep hills will struggle</p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
