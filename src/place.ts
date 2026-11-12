import { Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three/webgpu";
import type { FlowerSettings } from "./settings";

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const rotation = new Euler();
const placed: { x: number; y: number; z: number }[] = [];
const reaches: number[] = [];

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function petalReach(settings: FlowerSettings, petalScale: number): number {
  return Math.max(settings.baseWidth, 0.06) * petalScale * 0.12;
}

function clearsEarlier(
  x: number,
  y: number,
  z: number,
  reach: number,
  count: number,
  padding: number,
): boolean {
  for (let index = 0; index < count; index += 1) {
    const previous = placed[index];
    if (!previous) continue;
    const limit = reach + (reaches[index] ?? 0) + padding;
    const dx = x - previous.x;
    const dy = y - previous.y;
    const dz = z - previous.z;
    if (dx * dx + dy * dy + dz * dz < limit * limit) return false;
  }
  return true;
}

function layerStep(settings: FlowerSettings, count: number): number {
  if (count <= 1) return 0;
  const slider = Math.abs(settings.indexYSpacing);
  if (count <= 8) return slider;
  const stacked = (settings.length * 0.22) / (count - 1);
  return Math.max(slider, stacked);
}

function separate(radius: number, angle: number, y: number, reach: number, count: number, settings: FlowerSettings): number {
  const step = Math.max(settings.collisionStep, reach * 0.04);
  let next = radius;
  for (let iteration = 0; iteration < settings.collisionIterations; iteration += 1) {
    const x = Math.cos(angle) * next;
    const z = Math.sin(angle) * next;
    if (clearsEarlier(x, y, z, reach, count, settings.collisionPadding)) return next;
    next += step;
  }
  return next;
}

export function writeInstances(mesh: InstancedMesh, settings: FlowerSettings): number {
  const count = Math.max(1, Math.min(300, Math.round(settings.instanceCount)));
  mesh.count = count;
  placed.length = 0;
  reaches.length = 0;
  const angleStep = (settings.phyllotaxisAngle * Math.PI) / 180;

  for (let index = 0; index < count; index += 1) {
    const t = count <= 1 ? 0 : index / (count - 1);
    const scaleT = Math.pow(t, settings.indexScalePower);
    const petalScale = settings.indexScaleMin + 0.25 + (settings.indexScaleMax - (settings.indexScaleMin + 0.25)) * scaleT;
    const reach = petalReach(settings, petalScale);
    let radius = settings.phyllotaxisStartRadius + settings.phyllotaxisSpacing * Math.pow(index + 1, settings.phyllotaxisExponent);
    radius += (hash(index, 1) * 2 - 1) * settings.radialJitter;
    let angle = index * angleStep;
    angle += (hash(index, 2) * 2 - 1) * settings.angularJitter;
    const step = layerStep(settings, count);
    const jitter = (hash(index, 4) - 0.5) * Math.max(step, settings.length * 0.012);
    const y = settings.indexYOffset + (count - 1 - index) * step + jitter;
    radius = separate(radius, angle, y, reach, index, settings);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    position.set(x, y, z);
    rotation.set(0, Math.atan2(x, z), 0);
    quaternion.setFromEuler(rotation);
    scale.setScalar(petalScale);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    placed.push({ x, y, z });
    reaches.push(reach);
  }

  mesh.instanceMatrix.needsUpdate = true;
  return count;
}
