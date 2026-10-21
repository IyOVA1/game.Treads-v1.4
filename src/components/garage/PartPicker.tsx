import { useState } from "react";
import {
  AnyPart,
  ChassisPart,
  EnginePart,
  WeaponPart,
  PartCategory,
} from "../../data/parts";
import { useTankStore } from "../../store/tankStore";
import "./PartPicker.css";

interface Props {
  title: string;
  parts: AnyPart[];
  selectedId: string;
  category: PartCategory;
}

/** All editable stats shown in the ℹ panel — edit values in src/data/parts.ts */
function formatStats(part: AnyPart): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "ID", value: part.id },
    { label: "Tier", value: String(part.tier) },
    { label: "Cost", value: `${part.cost} credits` },
    { label: "Weight", value: `${part.weight} kg` },
  ];

  if (part.category === "chassis") {
    const c = part as ChassisPart;
    rows.push(
      { label: "HP", value: String(c.hp) },
      { label: "Armor", value: String(c.armor) },
      { label: "Size (W×H×L)", value: c.size.join(" × ") },
      { label: "Ability", value: c.abilityName },
      { label: "Ability ID", value: c.abilityId },
      { label: "Duration", value: `${c.abilityDuration ?? "—"} s` },
      { label: "Cooldown", value: `${c.abilityCooldown} s` },
      { label: "Ability desc", value: c.abilityDescription },
    );
    if (c.abilitySpeedBonus != null)
      rows.push({ label: "Speed bonus", value: `+${c.abilitySpeedBonus * 100}%` });
    if (c.abilityShieldHp != null)
      rows.push({ label: "Shield HP", value: String(c.abilityShieldHp) });
    if (c.abilityRadius != null)
      rows.push({ label: "Ability radius", value: `${c.abilityRadius} m` });
    if (c.abilityDamageReduction != null)
      rows.push({ label: "Damage reduction", value: `${c.abilityDamageReduction * 100}%` });
    if (c.abilityHealPerSec != null)
      rows.push({ label: "Heal / s", value: String(c.abilityHealPerSec) });
    if (c.abilityDamagePerSec != null)
      rows.push({ label: "DPS (field)", value: String(c.abilityDamagePerSec) });
  }

  if (part.category === "engine") {
    const e = part as EnginePart;
    rows.push(
      { label: "Max speed", value: `${e.maxSpeed} m/s` },
      { label: "Weight limit", value: `${e.weightLimit} kg` },
      { label: "Climb limit", value: `${e.climbLimit} kg` },
      { label: "Torque", value: String(e.torque) },
    );
  }

  if (part.category === "weapon") {
    const w = part as WeaponPart;
    rows.push(
      { label: "Type", value: w.weaponType },
      { label: "Damage / shot", value: String(w.damage) },
      { label: "RPM", value: String(w.rpm) },
      { label: "Magazine", value: w.magazine > 0 ? String(w.magazine) : "∞" },
      { label: "Reload", value: `${w.reload} s` },
      { label: "Range", value: `${w.range} m` },
      { label: "Projectile speed", value: String(w.projectileSpeed) },
      { label: "Recoil", value: String(w.recoil) },
      { label: "Arc", value: `${w.arc}°` },
    );
    if (w.splashRadius != null)
      rows.push({ label: "Splash radius", value: `${w.splashRadius}` });
    if (w.isCharge)
      rows.push({ label: "Charge weapon", value: "yes" });
  }

  rows.push({ label: "Description", value: part.description });
  return rows;
}

export function PartPicker({ title, parts, selectedId, category }: Props) {
  const {
    unlockedParts,
    unlockedTier,
    purchasePart,
    setChassis,
    setEngine,
    setWeapon,
    coins,
  } = useTankStore();

  const [infoId, setInfoId] = useState<string | null>(null);

  const select = (id: string) => {
    if (category === "chassis") setChassis(id);
    else if (category === "engine") setEngine(id);
    else setWeapon(id);
  };

  const infoPart = infoId ? parts.find((p) => p.id === infoId) : null;

  return (
    <section className="part-picker">
      <h2>{title}</h2>
      <div className="part-list">
        {parts.map((part) => {
          const owned = unlockedParts.includes(part.id);
          const tierOk = part.tier <= unlockedTier;
          const selected = selectedId === part.id;
          const canBuy = !owned && tierOk && coins >= part.cost;

          return (
            <div
              key={part.id}
              className={`part-card ${selected ? "selected" : ""} ${
                !owned ? "locked" : ""
              } ${!tierOk ? "tier-locked" : ""}`}
            >
              <div className="part-info">
                <div className="part-name">
                  {part.name}
                  <span className="tier">T{part.tier}</span>
                  <button
                    type="button"
                    className="info-btn"
                    title="Full stats (edit in src/data/parts.ts)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoId(infoId === part.id ? null : part.id);
                    }}
                  >
                    ℹ
                  </button>
                </div>
                <div className="part-desc">{part.description}</div>
                <div className="part-meta">
                  <span>⚖ {part.weight} kg</span>
                  {!owned && tierOk && (
                    <span className="cost">🪙 {part.cost}</span>
                  )}
                </div>
              </div>
              <div className="part-actions">
                {!tierOk ? (
                  <span className="badge">🔒 Tier {part.tier}</span>
                ) : owned ? (
                  <button
                    type="button"
                    className={selected ? "equip active" : "equip"}
                    onClick={() => select(part.id)}
                  >
                    {selected ? "Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="buy"
                    disabled={!canBuy}
                    onClick={() => purchasePart(part.id, part.cost)}
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {infoPart && (
        <div className="stats-modal" role="dialog" aria-label="Part stats">
          <div className="stats-modal-inner">
            <header>
              <h3>
                {infoPart.name} <span className="tier">T{infoPart.tier}</span>
              </h3>
              <button type="button" className="close-btn" onClick={() => setInfoId(null)}>
                ✕
              </button>
            </header>
            <p className="stats-edit-hint">
              Edit numbers in <code>src/data/parts.ts</code> — search for{" "}
              <code>{infoPart.id}</code>
            </p>
            <dl className="stats-dl">
              {formatStats(infoPart).map((row) => (
                <div key={row.label} className="stats-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
