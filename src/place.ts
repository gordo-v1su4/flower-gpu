import { Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three/webgpu";
import { allocateWhorls, architectureFor } from "./architecture";
import type { FlowerSettings } from "./settings";

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const rotation = new Euler(0, 0, 0, "YXZ");

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function writeInstances(mesh: InstancedMesh, settings: FlowerSettings): number {
  const count = Math.max(1, Math.min(300, Math.round(settings.instanceCount)));
  const architecture = architectureFor(settings.name);
  const whorls = allocateWhorls(count, architecture);
  mesh.count = count;

  let index = 0;
  for (let ring = 0; ring < whorls.length; ring += 1) {
    const ringCount = whorls[ring] ?? count;
    const ringT = whorls.length <= 1 ? 1 : ring / (whorls.length - 1);
    const ringRadius = settings.phyllotaxisStartRadius
      + architecture.radialSpread * Math.pow(ringT, 1.18)
      + ring * architecture.ringGap;

    for (let local = 0; local < ringCount; local += 1) {
      const globalT = count <= 1 ? 1 : index / (count - 1);
      const localT = ringCount <= 1 ? 0 : local / ringCount;
      const goldenStagger = ring * 2.399963229728653;
      let angle = architecture.angleOffset + localT * Math.PI * 2 + goldenStagger;
      angle += (hash(index, 2) * 2 - 1) * settings.angularJitter;

      if (architecture.kind === "lily") {
        angle = architecture.angleOffset + index * Math.PI / 3 + (index % 2) * Math.PI / 6;
      } else if (architecture.kind === "rose" || architecture.kind === "rosette") {
        angle = architecture.angleOffset + index * 2.399963229728653;
        angle += (hash(index, 2) * 2 - 1) * settings.angularJitter;
      }

      const jitter = (hash(index, 1) * 2 - 1) * settings.radialJitter;
      let radius = Math.max(0.006, ringRadius + jitter);
      const seedOffset = settings.variationSeed * 19.19;
      const randomLength = hash(index, 11 + seedOffset) * 2 - 1;
      const randomWidth = hash(index, 12 + seedOffset) * 2 - 1;
      const randomHeight = hash(index, 13 + seedOffset) * 2 - 1;
      const outerInfluence = 0.55 + ringT * 0.45;
      const alternatingLift = whorls.length > 1 ? (local % 2) * 0.006 : (index % 2) * 0.018;
      const heightJitter = randomHeight * settings.petalRandomness * outerInfluence * 0.52;
      let y = settings.indexYOffset
        + architecture.layerHeight * (1 - ringT)
        + alternatingLift
        + heightJitter
        + (hash(index, 4) - 0.5) * settings.indexYSpacing;
      if (architecture.kind === "chrysanthemum") {
        y = settings.indexYOffset
          + architecture.layerHeight * Math.pow(1 - ringT, 0.72)
          + alternatingLift
          + heightJitter
          + randomHeight * (0.14 + ringT * 0.2)
          + Math.sin(ringT * Math.PI) * 0.14
          + Math.pow(ringT, 1.4) * 0.08;
      }
      let yaw = angle;
      let roll = (hash(index, 7) * 2 - 1) * settings.indexTwist * 0.24
        + randomHeight * settings.petalRandomness * 0.1;

      if (architecture.kind === "rose") {
        radius = Math.max(0.008, 0.018 + 0.19 * Math.pow(globalT, 0.75) + jitter * 0.2);
        y = settings.indexYOffset + architecture.layerHeight * Math.pow(1 - globalT, 1.2) + heightJitter * 0.8;
        yaw = angle + 0.74 - globalT * 0.28;
        roll *= 0.35;
      } else if (architecture.kind === "rosette") {
        radius = Math.max(0.006, 0.015 + 0.11 * Math.sqrt(globalT) + jitter * 0.25);
        y = settings.indexYOffset + 0.3 * Math.pow(1 - globalT, 1.4) + heightJitter * 0.25;
        yaw = angle + 0.2;
        roll *= 0.3;
      }

      const scaleT = Math.pow(globalT, settings.indexScalePower);
      const petalScale = settings.indexScaleMin
        + (settings.indexScaleMax - settings.indexScaleMin) * scaleT;
      const lilyVariation = architecture.kind === "lily" && index % 2 === 0 ? 0.9 : 1;
      const radialLength = 0.94 + settings.radialLengthRamp * ringT;
      const lengthVariation = 1 + randomLength * settings.petalRandomness * outerInfluence;
      const widthVariation = 1 + randomWidth * settings.petalRandomness * outerInfluence * 0.42;
      const baseScale = Math.max(0.05, petalScale * lilyVariation);
      scale.set(
        baseScale * widthVariation,
        baseScale * radialLength * lengthVariation,
        baseScale * widthVariation,
      );

      if (architecture.kind === "orchid") {
        const orchidAngles = [-1.28, 1.28, 0, -2.35, 2.35];
        const isPetal = index < 2;
        const isDorsal = index === 2;
        position.set(0, 0.16, isPetal ? 0.02 : -0.1);
        rotation.set(0, 0, orchidAngles[index] ?? 0);
        quaternion.setFromEuler(rotation);
        const width = isPetal ? 1.28 : isDorsal ? 0.72 : 0.64;
        const length = isPetal ? 1.05 : isDorsal ? 0.96 : 0.9;
        scale.set(width, length, width);
      } else {
        position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
        rotation.set(0, yaw, roll);
        quaternion.setFromEuler(rotation);
      }

      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      index += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return count;
}
