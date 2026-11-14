import { PRESETS, type FlowerPreset } from "./presets";
import { shapeFor, type ShapeSettings } from "./shape";

export type MotionMode = "off" | "bloom" | "rotate" | "sway";

export type FlowerSettings = FlowerPreset & ShapeSettings & {
  segments: number;
  widthSegments: number;
  materialSparkleIntensity: number;
  materialHueShift: number;
  materialRadialInner: number;
  materialRadialOuter: number;
  materialRadialPower: number;
  materialRadialStrength: number;
  materialRadialFloor: number;
  wireframe: boolean;
  motionMode: MotionMode;
  petalRandomness: number;
  radialLengthRamp: number;
  variationSeed: number;
  petalClearance: number;
  closedScale: number;
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
  return {
    ...preset,
    ...shapeFor(preset.name),
    segments: 64,
    widthSegments: 32,
    materialSparkleIntensity: 0.18,
    materialHueShift: 0,
    materialRadialInner: 1.08,
    materialRadialOuter: 0.72,
    materialRadialPower: 1,
    materialRadialStrength: 0.6,
    materialRadialFloor: 0.35,
    wireframe: false,
    motionMode: "sway",
    petalRandomness: 0.07,
    radialLengthRamp: 0.22,
    variationSeed: 1,
    petalClearance: 0.045,
    closedScale: 0.5,
    deintersectionRadius: 0.85,
    deintersectionStrength: 0.4,
    collisionScale: 0.01,
    collisionPadding: 0.02,
    collisionStep: 0.00125,
    collisionIterations: 80,
  };
}

export function assignPreset(settings: FlowerSettings, preset: FlowerPreset): void {
  Object.assign(settings, preset, shapeFor(preset.name));
  settings.petalRandomness=['GardenChrysanthemum','SoftPeony'].includes(preset.name)?0.18:preset.name.includes('Dahlia')?0.14:0.07;
}
