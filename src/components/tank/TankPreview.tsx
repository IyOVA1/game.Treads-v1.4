import { useMemo } from "react";
import { TankBlueprint, getPart, ChassisPart, WeaponPart } from "../../data/parts";

interface Props {
  blueprint: TankBlueprint;
}

export function TankPreview({ blueprint }: Props) {
  const chassis = getPart<ChassisPart>(blueprint.chassisId)!;
  const weapon = getPart<WeaponPart>(blueprint.weaponId)!;

  const [w, h, l] = chassis.size;

  // Simple procedural colors by tier
  const bodyColor = useMemo(() => {
    const tier = chassis.tier;
    return tier === 1 ? "#4b5563" : tier === 2 ? "#374151" : "#1f2937";
  }, [chassis.tier]);

  return (
    <group position={[0, h / 2, 0]}>
      {/* Hull */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, l]} />
        <meshStandardMaterial color={bodyColor} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Tracks (left/right) */}
      <mesh position={[-w / 2 - 0.15, -h / 2 + 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.5, l * 0.95]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[w / 2 + 0.15, -h / 2 + 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.5, l * 0.95]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* Turret */}
      <group position={[0, h / 2 + 0.25, -0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.7, 0.85, 0.5, 8]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Barrel */}
        <mesh
          position={[0, 0.1, l * 0.35 + 0.4]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.15, l * 0.55 + 0.6, 8]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Muzzle brake hint for higher tiers */}
        {weapon.tier >= 2 && (
          <mesh position={[0, 0.1, l * 0.55 + 0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 6]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        )}
      </group>
    </group>
  );
}
