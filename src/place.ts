import { Euler, InstancedMesh, InstancedInterleavedBuffer, InterleavedBufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry } from "three/webgpu";
import { allocateWhorls, architectureFor } from "./architecture";
import { cubic, HEIGHT_KEYS } from "./shape";
import type { FlowerSettings } from "./settings";

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const rotation = new Euler(0, 0, 0, "YXZ");
const instanceBuffers = new WeakMap<BufferGeometry, InstancedInterleavedBuffer>();

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function writeInstances(mesh: InstancedMesh, settings: FlowerSettings): number {
  const count = Math.max(1, Math.min(300, Math.round(settings.instanceCount)));
  const architecture = architectureFor(settings.name);
  const whorls = allocateWhorls(count, architecture);
  mesh.count = count;
  const radialValues = new Float32Array(300);
  const attachmentValues = new Float32Array(300);
  const heightValues = new Float32Array(300);
  const orchidAngles = new Float32Array(300);
  const orchidOffsets = new Float32Array(900);
  const orchidScales = new Float32Array(900);

  let index = 0;
  for (let ring = 0; ring < whorls.length; ring += 1) {
    const ringCount = whorls[ring] ?? count;
    const ringT = whorls.length <= 1 ? 1 : ring / (whorls.length - 1);

    for (let local = 0; local < ringCount; local += 1) {
      const globalT = count <= 1 ? 1 : index / (count - 1);
      const radialT = architecture.kind === "rose" || architecture.kind === "rosette" ? globalT : ringT;
      const ringRadius = settings.phyllotaxisStartRadius
        + settings.radialSpan * Math.pow(radialT, settings.phyllotaxisExponent * 2)
        + ring * settings.phyllotaxisSpacing * 0.1;
      radialValues[index] = radialT;
      const localT = ringCount <= 1 ? 0 : local / ringCount;
      const goldenStagger = ring * settings.phyllotaxisAngle * Math.PI / 180;
      let angle = architecture.angleOffset + localT * Math.PI * 2 + goldenStagger;
      angle += (hash(index, 2) * 2 - 1) * settings.angularJitter;

      if (architecture.kind === "lily") {
        angle = architecture.angleOffset + index * Math.PI / 3;
      } else if (architecture.kind === "rose" || architecture.kind === "rosette") {
        angle = architecture.angleOffset + index * settings.phyllotaxisAngle * Math.PI / 180;
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
      const heightJitter = randomHeight * settings.petalRandomness * outerInfluence * 0.12;
      let y = settings.indexYOffset
        + cubic(HEIGHT_KEYS.map((key) => settings[key]), radialT)
        + settings.petalClearance * localT
        + alternatingLift
        + heightJitter
        + (hash(index, 4) - 0.5) * settings.indexYSpacing;
      let yaw = angle;
      let roll = (hash(index, 7) * 2 - 1) * settings.indexTwist * 0.24
        + randomHeight * settings.petalRandomness * 0.1;
      if (architecture.rings > 1) roll += settings.petalClearance * 0.8;

      if (architecture.kind === "rose") {
        yaw = angle + 0.25 - globalT * 0.15;
        roll *= 0.35;
      } else if (architecture.kind === "rosette") {
        yaw = angle + 0.2;
        roll *= 0.3;
      }

      const scaleT = Math.pow(radialT, settings.indexScalePower);
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
        const tepalAngles = [-1.35, 1.35, 0, -2.4, 2.4];
        const isPetal = index < 2;
        const isDorsal = index === 2;
        const tepalAngle = tepalAngles[index % 5] ?? 0;
        position.set(-Math.sin(tepalAngle) * radius, 0.16 + y + Math.cos(tepalAngle) * radius, isPetal ? 0.08 : -0.08);
        rotation.set(-0.95, 0, tepalAngle, "ZXY");
        orchidAngles[index] = tepalAngle;
        quaternion.setFromEuler(rotation);
        const width = isPetal ? 1.5 : isDorsal ? 0.9 : 0.82;
        const length = isPetal ? 0.95 : isDorsal ? 0.9 : 0.86;
        scale.set(width, length, width);
      } else {
        position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
        rotation.set(0, yaw, roll);
        quaternion.setFromEuler(rotation);
      }

      attachmentValues[index] = radius;
      heightValues[index] = position.y;
      orchidOffsets.set([position.x, position.y, position.z], index * 3);
      orchidScales.set([scale.x, scale.y, scale.z], index * 3);

      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      index += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  // One interleaved instance buffer stays within WebGPU's eight-buffer baseline.
  const metadata = new Float32Array(300 * 10);
  for (let i = 0; i < 300; i++) {
    metadata.set([radialValues[i]!, attachmentValues[i]!, heightValues[i]!, orchidAngles[i]!,
      orchidOffsets[i*3]!, orchidOffsets[i*3+1]!, orchidOffsets[i*3+2]!,
      orchidScales[i*3]!, orchidScales[i*3+1]!, orchidScales[i*3+2]!], i * 10);
  }
  let buffer = instanceBuffers.get(mesh.geometry);
  if (buffer) {
    buffer.array.set(metadata);
    buffer.needsUpdate = true;
    return count;
  }
  buffer = new InstancedInterleavedBuffer(metadata, 10);
  instanceBuffers.set(mesh.geometry, buffer);
  for (const [name, size, offset] of [["radialT",1,0],["attachmentRadius",1,1],["attachmentHeight",1,2],["tepalAngle",1,3],["petalOffset",3,4],["petalScale",3,7]] as const) {
    mesh.geometry.setAttribute(name, new InterleavedBufferAttribute(buffer, size, offset));
  }
  mesh.computeBoundingSphere();
  return count;
}
