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
  let ringStart = 0;
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
      }

      const jitter = (hash(index, 1) * 2 - 1) * settings.radialJitter;
      const radius = Math.max(0.006, ringRadius + jitter);
      const seedOffset = settings.variationSeed * 19.19;
      const randomLength = hash(index, 11 + seedOffset) * 2 - 1;
      const randomWidth = hash(index, 12 + seedOffset) * 2 - 1;
      const randomHeight = hash(index, 13 + seedOffset) * 2 - 1;
      const outerInfluence = 0.55 + ringT * 0.45;
      const alternatingLift = whorls.length > 1 ? (local % 2) * 0.006 : (index % 2) * 0.018;
      const heightJitter = randomHeight * settings.petalRandomness * outerInfluence * 0.52;
      const y = settings.indexYOffset
        + architecture.layerHeight * (1 - ringT)
        + alternatingLift
        + heightJitter
        + (hash(index, 4) - 0.5) * settings.indexYSpacing;

      position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      const roll = (hash(index, 7) * 2 - 1) * settings.indexTwist * 0.24
        + randomHeight * settings.petalRandomness * 0.1;
      rotation.set(0, angle, roll);
      quaternion.setFromEuler(rotation);

      const scaleT = Math.pow(globalT, settings.indexScalePower);
      const petalScale = settings.indexScaleMin
        + (settings.indexScaleMax - settings.indexScaleMin) * scaleT;
      const lilyVariation = architecture.kind === "lily" && index % 2 === 0 ? 0.88 : 1;
      const radialLength = 0.94 + settings.radialLengthRamp * ringT;
      const lengthVariation = 1 + randomLength * settings.petalRandomness * outerInfluence;
      const widthVariation = 1 + randomWidth * settings.petalRandomness * outerInfluence * 0.42;
      const baseScale = Math.max(0.05, petalScale * lilyVariation);
      scale.set(
        baseScale * widthVariation,
        baseScale * radialLength * lengthVariation,
        baseScale * widthVariation,
      );
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      index += 1;
    }
    ringStart += ringCount;
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return count;
}
