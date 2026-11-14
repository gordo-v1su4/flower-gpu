import { architectureFor } from "./architecture";

export type ShapeSettings = {
  curveBase: number; curveShoulder: number; curveBend: number; curveTip: number;
  outerBase: number; outerShoulder: number; outerBend: number; outerTip: number;
  heightCenter: number; heightShoulder: number; heightRim: number; heightEdge: number;
  radialSpan: number; petalCup: number;
};

export const INNER_KEYS = ["curveBase", "curveShoulder", "curveBend", "curveTip"] as const;
export const OUTER_KEYS = ["outerBase", "outerShoulder", "outerBend", "outerTip"] as const;
export const HEIGHT_KEYS = ["heightCenter", "heightShoulder", "heightRim", "heightEdge"] as const;

/** Cubic Bernstein interpolation. t is normalized distance, values retain their units. */
export function cubic(values: readonly number[], t: number): number {
  const u = 1 - t;
  return u * u * u * values[0]! + 3 * u * u * t * values[1]!
    + 3 * u * t * t * values[2]! + t * t * t * values[3]!;
}

/** Integrate tangent angle from vertical; no displacement clamp or tip reset. */
export function samplePetal(angles: readonly number[], along: number, steps = 24): [number, number] {
  let radius = 0, height = 0;
  for (let i = 0; i < steps; i++) {
    const theta = cubic(angles, along * (i + 0.5) / steps);
    radius += Math.sin(theta) * along / steps;
    height += Math.cos(theta) * along / steps;
  }
  return [radius, height];
}

export function shapeFor(name: string): ShapeSettings {
  const kind = architectureFor(name).kind;
  let inner = [0.1, 0.3, 0.5, 0.8], outer = [0.5, 1.1, 1.5, 1.8];
  let heights = [0.12, 0.1, 0.04, 0], span = 0.35, cup = 0.32;
  switch (kind) {
    case "rose":
      inner = [0.8, 0.02, 0.05, 0.35]; outer = [1.15, 0.15, 0.6, 1.7];
      heights = [0.2, 0.18, 0.06, 0.02]; span = 0.24; cup = 0.5; break;
    case "chrysanthemum":
      inner = [0.05, 1.3, 1.4, -3.0]; outer = [0.6, 1.6, 3.2, 4.2];
      heights = [0.2, 0.16, 0.06, 0]; span = 0.3; cup = 0.4; break;
    case "dahlia":
      inner = [0.12, 0.32, 0.6, 0.95]; outer = [0.65, 1.2, 1.8, 2.2];
      heights = [0.85, 0.65, 0.15, 0.02]; span = 0.24; cup = 0.65; break;
    case "peony":
      inner = [0.15, 0.15, 0.3, 0.7]; outer = [0.25, 0.35, 0.65, 1.7];
      heights = [0.17, 0.13, 0.06, 0.015]; span = 0.38; cup = 0.45; break;
    case "rosette":
      inner = [0.08, 0.2, 0.35, 0.65]; outer = [0.6, 1, 1.5, 1.1];
      heights = [0.68, 0.5, 0.16, 0.02]; span = 0.16; cup = 0.3; break;
    case "lily":
      inner = outer = [0.55, 0.85, 1.65, 2.9];
      heights = [0.015, 0.015, 0.015, 0.015]; span = 0.01; cup = 0.22; break;
    case "passion":
      inner = outer = [1.2, 1.65, 1.65, 1.5];
      heights = [0.03, 0.03, 0.03, 0.03]; span = 0.01; cup = 0.12; break;
    case "orchid":
      inner = outer = [0.65, 0.8, 1, 1.25];
      heights = [0, 0, 0, 0]; span = 0; cup = 0.18; break;
  }
  return Object.fromEntries([
    ...INNER_KEYS.map((key, i) => [key, inner[i]]),
    ...OUTER_KEYS.map((key, i) => [key, outer[i]]),
    ...HEIGHT_KEYS.map((key, i) => [key, heights[i]]),
    ["radialSpan", span], ["petalCup", cup],
  ]) as ShapeSettings;
}
