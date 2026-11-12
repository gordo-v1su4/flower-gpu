import { PRESETS, type FlowerPreset } from "./presets";

export type MotionMode = "off" | "bloom" | "rotate" | "sway";

export type FlowerSettings = Omit<FlowerPreset, "name"> & {
  segments: number;
  widthSegments: number;
  materialSparkleIntensity: number;
  materialHueShift: number;
  wireframe: boolean;
  motionMode: MotionMode;
  deintersectionRadius: number;
  deintersectionStrength: number;
  collisionScale: number;
  collisionPadding: number;
  collisionStep: number;
  collisionIterations: number;
};

const STARTING_PRESET = "VelvetDahlia";

export function createSettings(): FlowerSettings {
  const preset = PRESETS.find((entry) => entry.name === STARTING_PRESET);
  if (!preset) throw new Error(`Missing ${STARTING_PRESET} preset`);
  const { name: _name, ...values } = preset;
  return {
    ...values,
    segments: 36,
    widthSegments: 28,
    materialSparkleIntensity: 0.18,
    materialHueShift: 0,
    wireframe: false,
    motionMode: "off",
    deintersectionRadius: 0.85,
    deintersectionStrength: 0.4,
    collisionScale: 0.01,
    collisionPadding: 0.02,
    collisionStep: 0.00125,
    collisionIterations: 80,
  };
}

export function assignPreset(settings: FlowerSettings, preset: FlowerPreset): void {
  const { name: _name, ...values } = preset;
  Object.assign(settings, values);
}
