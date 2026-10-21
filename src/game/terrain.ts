import * as THREE from "three";

// The battlefield is 600 x 600 units (the old one was 80 x 80).
export const MAP_SIZE = 600;
export const MAP_LIMIT = MAP_SIZE / 2 - 6; // tanks can't drive past this

// Ground height at any (x, z). Several sine waves stacked give rolling hills.
export function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.02) * 6 +
    Math.cos(z * 0.026) * 5 +
    Math.sin((x + z) * 0.012) * 4 +
    Math.sin(x * 0.06 + 1.3) * Math.cos(z * 0.055) * 1.6 +
    Math.sin(x * 0.15) * Math.sin(z * 0.13) * 0.4
  );
}

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _tf = new THREE.Vector3();
const _tr = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _back = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Works out where a tank of size (w x l) should sit on the ground and how it
// should tilt. It samples the ground under the front, back, left and right of
// the hull, so the tank leans up and down the hills instead of clipping them.
export function sampleHull(
  x: number,
  z: number,
  yaw: number,
  w: number,
  l: number,
  outQuat: THREE.Quaternion
): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = -fz; // right vector = forward rotated 90 degrees
  const rz = fx;

  const hF = terrainHeight(x + fx * l * 0.5, z + fz * l * 0.5);
  const hB = terrainHeight(x - fx * l * 0.5, z - fz * l * 0.5);
  const hR = terrainHeight(x + rx * w * 0.5, z + rz * w * 0.5);
  const hL = terrainHeight(x - rx * w * 0.5, z - rz * w * 0.5);

  _f.set(fx, 0, fz);
  _r.set(rx, 0, rz);
  _tf.copy(_f).setY((hF - hB) / l);
  _tr.copy(_r).setY((hR - hL) / w);
  _up.copy(_tr).cross(_tf).normalize();
  if (_up.y < 0) _up.negate();

  _right.copy(_f).cross(_up).normalize();
  _fwd.copy(_up).cross(_right).normalize();
  _back.copy(_fwd).negate();
  _m.makeBasis(_right, _up, _back);
  outQuat.setFromRotationMatrix(_m);

  return (hF + hB + hR + hL) / 4;
}

// Slope along the direction of travel (positive = uphill).
export function slopeAlong(x: number, z: number, yaw: number): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  return (terrainHeight(x + fx, z + fz) - terrainHeight(x - fx, z - fz)) / 2;
}
