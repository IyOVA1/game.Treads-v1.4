import { useMemo } from "react";
import * as THREE from "three";
import { MAP_SIZE, terrainHeight } from "../../game/terrain";

export function Terrain() {
  const geometry = useMemo(() => {
    const segments = 150; // 4 units per square
    const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors: number[] = [];
    const low = new THREE.Color("#365314");
    const high = new THREE.Color("#a3a35a");
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = terrainHeight(pos.getX(i), pos.getZ(i));
      pos.setY(i, y);
      // Higher ground fades from green to dry tan so hills are easy to read
      c.copy(low).lerp(high, THREE.MathUtils.clamp((y + 10) / 22, 0, 1));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0.02} />
    </mesh>
  );
}
