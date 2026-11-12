export type FlowerKind =
  | "dahlia"
  | "peony"
  | "orchid"
  | "chrysanthemum"
  | "rosette"
  | "lily"
  | "bell"
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

const ARCHITECTURES: Record<string, FlowerArchitecture> = {
  VelvetDahlia: {
    kind: "dahlia", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.24, rootOuter: 1.38, rootPower: 0.82,
    radialSpread: 0.2, layerHeight: 0.34, ringGap: 0.024, angleOffset: 0.1, centerScale: 0.65,
  },
  SoftPeony: {
    kind: "peony", rings: 6, weights: [0.65, 0.8, 0.95, 1.05, 1.15, 1.2],
    rootInner: 0.18, rootOuter: 1.18, rootPower: 0.74,
    radialSpread: 0.22, layerHeight: 0.38, ringGap: 0.034, angleOffset: 0.32, centerScale: 0.45,
  },
  WildOrchid: {
    kind: "orchid", rings: 1, weights: [1],
    rootInner: 1.12, rootOuter: 1.32, rootPower: 1,
    radialSpread: 0.02, layerHeight: 0, ringGap: 0, angleOffset: Math.PI * 0.1, centerScale: 0.7,
  },
  SpiderChrysanthemum: {
    kind: "chrysanthemum", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.3, rootOuter: 1.42, rootPower: 0.86,
    radialSpread: 0.24, layerHeight: 0.4, ringGap: 0.026, angleOffset: 0, centerScale: 0.55,
  },
  SunburstDahlia: {
    kind: "dahlia", rings: 7, weights: COMPOSITE_WEIGHTS,
    rootInner: 0.28, rootOuter: 1.46, rootPower: 0.86,
    radialSpread: 0.22, layerHeight: 0.32, ringGap: 0.024, angleOffset: 0.2, centerScale: 0.5,
  },
  StoneRosette: {
    kind: "rosette", rings: 4, weights: [0.6, 0.85, 1.1, 1.35],
    rootInner: 0.18, rootOuter: 1.24, rootPower: 0.72,
    radialSpread: 0.34, layerHeight: 0.24, ringGap: 0.075, angleOffset: 0.15, centerScale: 0,
  },
  StargazerLily: {
    kind: "lily", rings: 1, weights: [1],
    rootInner: 0.96, rootOuter: 1.18, rootPower: 1,
    radialSpread: 0.02, layerHeight: 0, ringGap: 0, angleOffset: Math.PI / 6, centerScale: 0.65,
  },
  ForestBell: {
    kind: "bell", rings: 1, weights: [1],
    rootInner: 2.68, rootOuter: 2.88, rootPower: 1,
    radialSpread: 0.1, layerHeight: 0, ringGap: 0, angleOffset: 0, centerScale: 0.4,
  },
  CopperRose: {
    kind: "rose", rings: 5, weights: [0.6, 0.78, 0.95, 1.1, 1.25],
    rootInner: 0.12, rootOuter: 1.12, rootPower: 0.64,
    radialSpread: 0.22, layerHeight: 0.34, ringGap: 0.035, angleOffset: 0.4, centerScale: 0,
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
