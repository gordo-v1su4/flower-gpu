import { BufferGeometry, Float32BufferAttribute, MathUtils } from "three/webgpu";
import type { PetalProfile } from "./presets";
import type { FlowerSettings } from "./settings";

function outline(profile: PetalProfile, along: number): number {
  switch (profile) {
    case "pointed": {
      const bell = Math.sin(Math.pow(along, 0.7) * Math.PI);
      const tip = 1 - Math.pow(along, 2.6) * 0.96;
      return Math.pow(Math.max(bell, 0), 0.58) * tip;
    }
    case "round": {
      const bell = Math.sin(Math.pow(along, 0.48) * Math.PI);
      const tip = 1 - Math.pow(along, 7) * 0.22;
      return Math.pow(Math.max(bell, 0), 0.32) * tip;
    }
    case "strap": {
      const body = 0.42 + 0.2 * Math.sin(Math.pow(along, 0.9) * Math.PI);
      const tip = 1 - Math.pow(along, 1.7) * 0.55;
      return body * tip;
    }
    case "spoon": {
      const claw = along * along * (3 - 2 * along);
      const open = Math.min(1, Math.max(0, (along - 0.08) / 0.92));
      const bowl = Math.sin(open * Math.PI);
      const tip = 1 - Math.pow(along, 6) * 0.18;
      return (0.16 + 0.84 * Math.pow(claw, 0.65)) * Math.pow(Math.max(bowl, 0), 0.42) * tip;
    }
    case "bell": {
      const flare = 0.78 + 0.22 * (along * along * (3 - 2 * along));
      const rimDrop = Math.max(0, (along - 0.9) / 0.1);
      return flare * (1 - rimDrop * rimDrop * 0.18);
    }
    default: {
      const unreachable: never = profile;
      throw new Error(unreachable);
    }
  }
}

function ruffle(profile: PetalProfile, along: number, signed: number): number {
  const margin = signed * signed;
  switch (profile) {
    case "pointed":
      return 1 + 0.035 * Math.sin(along * Math.PI * 1.1);
    case "round":
      return 1 + 0.05 * Math.sin(along * Math.PI * 2.2 + signed * 1.2) * (0.25 + 0.75 * margin);
    case "strap":
      return 1 + 0.06 * Math.sin(along * Math.PI * 4 + signed);
    case "spoon":
      return 1 + 0.04 * Math.sin(along * Math.PI) * (0.35 + 0.65 * margin);
    case "bell":
      return 1;
    default: {
      const unreachable: never = profile;
      throw new Error(unreachable);
    }
  }
}

export function createPetalGeometry(settings: FlowerSettings): BufferGeometry {
  const rows = Math.round(settings.segments) + 1;
  const columns = Math.round(settings.widthSegments) + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const profile = settings.petalProfile;

  for (let row = 0; row < rows; row += 1) {
    const along = row / (rows - 1);
    const y = along * settings.length;
    const neck = MathUtils.smoothstep(along, 0.0, 0.36);
    const gathered = MathUtils.lerp(0.06, 1, neck);
    const base = MathUtils.lerp(settings.baseWidth, 1, MathUtils.smoothstep(along, 0.04, 0.28));
    const tip = MathUtils.lerp(settings.tipWidth, 1, MathUtils.smoothstep(along, 0.75, 1));
    const halfWidth = settings.width * 0.5 * outline(profile, along) * base * gathered * tip;
    const root = MathUtils.smoothstep(along, 0.04, Math.max(settings.rootLength, 0.08));

    for (let column = 0; column < columns; column += 1) {
      const u = column / (columns - 1);
      const signed = u * 2 - 1;
      const x = signed * halfWidth * ruffle(profile, along, signed);
      const roundness = Math.sqrt(Math.max(0, 1 - signed * signed));
      const z = roundness * settings.bloomRootRoundness * root * halfWidth;
      positions.push(x, y, z);
      uvs.push(u, along);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const start = row * columns + column;
      const right = start + 1;
      const above = start + columns;
      const aboveRight = above + 1;
      indices.push(start, above, right, right, above, aboveRight);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
