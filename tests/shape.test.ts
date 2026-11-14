import { describe, expect, test } from "bun:test";
import { InstancedMesh, MeshPhysicalNodeMaterial } from "three/webgpu";
import { cubic, samplePetal, shapeFor, INNER_KEYS, OUTER_KEYS, HEIGHT_KEYS } from "../src/shape";
import { createSettings, assignPreset } from "../src/settings";
import { PRESETS } from "../src/presets";
import { createPetalGeometry } from "../src/petalMesh";
import { writeInstances } from "../src/place";
import { bloomState } from "../src/bloom";

test("the closed head scales from half size before any petals unfold", () => {
  expect(bloomState(0)).toEqual({open: 0, scale: 0.5});
  expect(bloomState(0.11)).toEqual({open: 0, scale: 0.75});
  expect(bloomState(0.22)).toEqual({open: 0, scale: 1});
  expect(bloomState(1)).toEqual({open: 1, scale: 1});
  let previous = bloomState(0);
  for (let i = 1; i <= 100; i++) {
    const current = bloomState(i / 100);
    expect(current.open).toBeGreaterThanOrEqual(previous.open);
    expect(current.scale).toBeGreaterThanOrEqual(previous.scale);
    if (current.open > 0) expect(current.scale).toBe(1);
    previous = current;
  }
});

describe("curve mathematics", () => {
  test("straight tangents retain unit arc length at any angle", () => {
    for (const angle of [-2, -0.7, 0, 1.2, Math.PI, 4.5]) {
      const [r, y] = samplePetal([angle, angle, angle, angle], 1);
      expect(Math.hypot(r, y)).toBeCloseTo(1, 10);
      expect(r).toBeCloseTo(Math.sin(angle), 10);
      expect(y).toBeCloseTo(Math.cos(angle), 10);
    }
  });
  test("tip control changes tip direction without erasing its displacement", () => {
    const straight = samplePetal([0, 0, 0, 0], 1);
    const rolled = samplePetal([0, 0.5, 2, 4], 1);
    expect(straight[0]).toBeCloseTo(0, 10);
    expect(straight[1]).toBeCloseTo(1, 10);
    expect(Math.abs(rolled[0])).toBeGreaterThan(0.2);
    expect(rolled[1]).toBeLessThan(straight[1]);
  });
  test("radial height interpolation preserves its endpoints and has no overshoot", () => {
    const heights = [0.4, 0.7, -0.1, 0.02];
    expect(cubic(heights, 0)).toBe(heights[0]); expect(cubic(heights, 1)).toBe(heights[3]);
    for (let i = 0; i <= 100; i++) expect(cubic(heights, i / 100)).toBeWithin(-0.1, 0.70001);
  });
});

for (const preset of PRESETS) {
  test(`${preset.name}: finite geometry, placement and independent height controls`, () => {
    const settings = createSettings(); assignPreset(settings, preset);
    const defaults = shapeFor(preset.name);
    expect(INNER_KEYS.map((k) => settings[k])).toEqual(INNER_KEYS.map((k) => defaults[k]));
    for (const keys of [INNER_KEYS, OUTER_KEYS]) {
      for (let i = 0; i <= 100; i++) expect(samplePetal(keys.map(k => settings[k]), i/100).every(Number.isFinite)).toBe(true);
    }
    const geometry = createPetalGeometry(settings);
    const mesh = new InstancedMesh(geometry, new MeshPhysicalNodeMaterial(), 300);
    expect(writeInstances(mesh, settings)).toBe(preset.instanceCount);
    const attributes = ["radialT", "attachmentRadius", "attachmentHeight", "tepalAngle", "petalOffset", "petalScale"].map(name => geometry.getAttribute(name));
    expect(new Set(attributes.map(attribute => attribute.data)).size).toBe(1);
    const before = Array.from(mesh.instanceMatrix.array);
    const anglesBefore = [...INNER_KEYS, ...OUTER_KEYS].map(k => settings[k]);
    for (const key of HEIGHT_KEYS) settings[key] += 0.3;
    writeInstances(mesh, settings);
    const after = Array.from(mesh.instanceMatrix.array);
    for (let i = 0; i < mesh.count; i++) {
      expect(after.slice(i*16,(i+1)*16).every(Number.isFinite)).toBe(true);
      expect(after[i*16+12]).toBe(before[i*16+12]); expect(after[i*16+14]).toBe(before[i*16+14]);
      expect(after[i*16+13]! - before[i*16+13]!).toBeCloseTo(0.3, 5);
    }
    expect([...INNER_KEYS, ...OUTER_KEYS].map(k => settings[k])).toEqual(anglesBefore);
    geometry.dispose();
  });
}
