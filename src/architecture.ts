export type FlowerKind =
  | "dahlia"
  | "peony"
  | "orchid"
  | "chrysanthemum"
  | "rosette"
  | "lily"
  | "passion"
  | "rose";

export type FlowerArchitecture = {
  kind: FlowerKind;
  rings: number;
  weights: readonly number[];
  rootInner: number;
  rootOuter: number;
  rootPower: number;
  radialSpread: number;
  layerHeight: number;
  ringGap: number;
  angleOffset: number;
  centerScale: number;
};

const COMPOSITE_WEIGHTS = [0.55, 0.7, 0.85, 1, 1.12, 1.2, 1.28] as const;
const DENSE_WEIGHTS = [0.45, 0.55, 0.65, 0.78, 0.9, 1, 1.1, 1.18, 1.25] as const;

const ARCHITECTURES: Record<string, FlowerArchitecture> = {
  VelvetDahlia: {
    kind: "dahlia", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.24, rootOuter: 1.38, rootPower: 0.82,
    radialSpread: 0.2, layerHeight: 0.34, ringGap: 0.024, angleOffset: 0.1, centerScale: 0.65,
  },
  SoftPeony: {
    kind: "peony", rings: 4, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.42, rootOuter: 0.98, rootPower: 0.7,
    radialSpread: 0.18, layerHeight: 0.16, ringGap: 0.014, angleOffset: 0.32, centerScale: 0.26,
  },
  WildOrchid: {
    kind: "orchid", rings: 1, weights: [1],
    rootInner: 0.02, rootOuter: 0.02, rootPower: 1,
    radialSpread: 0, layerHeight: 0, ringGap: 0, angleOffset: 0, centerScale: 0,
  },
  GardenChrysanthemum: {
    kind: "chrysanthemum", rings: 9, weights: DENSE_WEIGHTS,
    rootInner: 0.1, rootOuter: 1.02, rootPower: 0.8,
    radialSpread: 0.16, layerHeight: 0.4, ringGap: 0.012, angleOffset: 0, centerScale: 0.25,
  },
  SunburstDahlia: {
    kind: "dahlia", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.22, rootOuter: 1.18, rootPower: 0.82,
    radialSpread: 0.16, layerHeight: 0.4, ringGap: 0.016, angleOffset: 0.2, centerScale: 0.4,
  },
  StoneRosette: {
    kind: "rosette", rings: 5, weights: [0.55, 0.72, 0.9, 1.08, 1.2],
    rootInner: 0.06, rootOuter: 0.92, rootPower: 0.7,
    radialSpread: 0.12, layerHeight: 0.36, ringGap: 0.022, angleOffset: 0.15, centerScale: 0,
  },
  StargazerLily: {
    kind: "lily", rings: 1, weights: [1],
    rootInner: 1.08, rootOuter: 1.22, rootPower: 1,
    radialSpread: 0.025, layerHeight: 0, ringGap: 0, angleOffset: Math.PI / 6, centerScale: 0.5,
  },
  PassionFlower: {
    kind: "passion", rings: 1, weights: [1],
    rootInner: 1.2, rootOuter: 1.38, rootPower: 1,
    radialSpread: 0.03, layerHeight: 0, ringGap: 0, angleOffset: Math.PI / 10, centerScale: 0,
  },
  CopperRose: {
    kind: "rose", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.03, rootOuter: 0.88, rootPower: 0.62,
    radialSpread: 0.06, layerHeight: 0.58, ringGap: 0.008, angleOffset: 0.4, centerScale: 0,
  },
};

export function architectureFor(name: string): FlowerArchitecture {
  return ARCHITECTURES[name] ?? ARCHITECTURES.VelvetDahlia!;
}

export function allocateWhorls(count: number, architecture: FlowerArchitecture): number[] {
  const rings = Math.max(1, Math.min(architecture.rings, Math.floor(count / 3)));
  if (rings === 1) return [count];
  const weights = architecture.weights.slice(0, rings);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const counts = weights.map((weight) => Math.max(3, Math.floor((weight / total) * count)));
  let remainder = count - counts.reduce((sum, value) => sum + value, 0);
  let cursor = counts.length - 1;
  while (remainder > 0) {
    counts[cursor] = (counts[cursor] ?? 0) + 1;
    remainder -= 1;
    cursor = (cursor - 1 + counts.length) % counts.length;
  }
  while (remainder < 0) {
    const index = counts.findIndex((value) => value > 3);
    if (index < 0) break;
    counts[index] = (counts[index] ?? 0) - 1;
    remainder += 1;
  }
  return counts;
}
