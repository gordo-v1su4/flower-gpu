import {
  Color,
  DoubleSide,
  InstancedMesh,
  MeshPhysicalNodeMaterial,
} from "three/webgpu";
import {
  Fn,
  abs,
  clamp,
  cos,
  buffer,
  cross,
  directionToFaceDirection,
  dot,
  exp,
  float,
  frontFacing,
  instanceIndex,
  max,
  mix,
  normalView,
  normalWorld,
  positionGeometry,
  positionLocal,
  positionViewDirection,
  pow,
  sin,
  smoothstep,
  transformNormal,
  transformNormalToView,
  uniform,
  uv,
  varying,
  vec3,
} from "three/tsl";
import { createPetalGeometry } from "./petalMesh";
import { writeInstances } from "./place";
import type { PetalProfile } from "./presets";
import type { FlowerSettings } from "./settings";

function edgePowerFor(profile: PetalProfile): number {
  switch (profile) {
    case "pointed":
      return 2.15;
    case "round":
      return 1.05;
    case "strap":
      return 2.8;
    case "spoon":
      return 1.35;
    case "bell":
      return 0.65;
    default: {
      const unreachable: never = profile;
      return unreachable;
    }
  }
}

const CAPACITY = 300;
const HUE_AXIS = vec3(0.57735, 0.57735, 0.57735);

type NumberUniform = TslNode & { value: number };
type TslNode = {
  x: TslNode;
  y: TslNode;
  z: TslNode;
  add: (value: unknown) => TslNode;
  sub: (value: unknown) => TslNode;
  mul: (value: unknown) => TslNode;
  div: (value: unknown) => TslNode;
  max: (value: unknown) => TslNode;
  mulAssign: (value: unknown) => TslNode;
  addAssign: (value: unknown) => TslNode;
  assign: (value: unknown) => TslNode;
  toVar: () => TslNode;
  toFloat: () => TslNode;
  negate: () => TslNode;
  normalize: () => TslNode;
};

function numberUniform(value: number): NumberUniform {
  return uniform(value);
}

export type FlowerView = {
  mesh: InstancedMesh;
  syncUniforms: () => void;
  updateMaterial: () => void;
  rebuildPetal: () => void;
  updateInstances: () => void;
  setWireframe: (enabled: boolean) => void;
};

export function createFlower(settings: FlowerSettings): FlowerView {
  const length = numberUniform(settings.length);
  const width = numberUniform(settings.width);
  const budDome = numberUniform(settings.budDome);
  const bloomDome = numberUniform(settings.bloomDome);
  const budDomePower = numberUniform(settings.budDomePower);
  const bloomDomePower = numberUniform(settings.bloomDomePower);
  const bloomRootRoundness = numberUniform(settings.bloomRootRoundness);
  const rootLength = numberUniform(settings.rootLength);
  const instanceCount = numberUniform(settings.instanceCount);
  const animation = numberUniform(settings.animation);
  const budRoot = numberUniform(settings.budRoot);
  const budSpine = numberUniform(settings.budSpine);
  const budTip = numberUniform(settings.budTip);
  const budSide = numberUniform(settings.budSide);
  const bloomRoot = numberUniform(settings.bloomRoot);
  const bloomSpine = numberUniform(settings.bloomSpine);
  const bloomTip = numberUniform(settings.bloomTip);
  const bloomSide = numberUniform(settings.bloomSide);
  const edgePower = numberUniform(edgePowerFor(settings.petalProfile));
  const animationSpread = numberUniform(settings.animationSpread);
  const animationDuration = numberUniform(settings.animationDuration);
  const animationOrder = numberUniform(settings.animationOrder);
  const animationJitter = numberUniform(settings.animationJitter);
  const indexScaleMin = numberUniform(settings.indexScaleMin);
  const indexScaleMax = numberUniform(settings.indexScaleMax);
  const indexScalePower = numberUniform(settings.indexScalePower);
  const indexLengthMin = numberUniform(settings.indexLengthMin);
  const indexLengthMax = numberUniform(settings.indexLengthMax);
  const indexLengthPower = numberUniform(settings.indexLengthPower);
  const indexWidthMin = numberUniform(settings.indexWidthMin);
  const indexWidthMax = numberUniform(settings.indexWidthMax);
  const indexWidthPower = numberUniform(settings.indexWidthPower);
  const indexBendMin = numberUniform(settings.indexBendMin);
  const indexBendMax = numberUniform(settings.indexBendMax);
  const indexTwist = numberUniform(settings.indexTwist);
  const indexVariation = numberUniform(settings.indexVariation);
  const colorBottom = uniform(new Color(settings.materialColorBottom));
  const colorTop = uniform(new Color(settings.materialColorTop));
  const colorTip = uniform(new Color(settings.materialTipColor));
  const borderColor = uniform(new Color(settings.materialBorderColor));
  const veinColor = uniform(new Color(settings.materialVeinColor));
  const highlightColor = uniform(new Color(settings.materialHighlightColor));
  const roughness = numberUniform(settings.materialRoughness);
  const iridescence = numberUniform(settings.materialIridescence);
  const ior = numberUniform(settings.materialIOR);
  const borderIntensity = numberUniform(settings.materialBorderIntensity);
  const borderWidth = numberUniform(settings.materialBorderWidth);
  const borderGlow = numberUniform(settings.materialBorderGlow);
  const veinIntensity = numberUniform(settings.materialVeinIntensity);
  const midribIntensity = numberUniform(settings.materialMidribIntensity);
  const sheenIntensity = numberUniform(settings.materialSheenIntensity);
  const transmission = numberUniform(settings.materialTransmission);
  const thickness = numberUniform(settings.materialThickness);
  const hueShift = numberUniform(settings.materialHueShift);
  const seam = numberUniform(settings.materialSeam ? 1 : 0);
  const metalness = numberUniform(settings.materialMetalness);
  const clearcoat = numberUniform(settings.materialClearcoat);
  const clearcoatRoughness = numberUniform(settings.materialClearcoatRoughness);
  const attenuationColor = new Color(settings.materialAttenuationColor);
  const pi = float(Math.PI);

  const indexT = Fn(() => instanceIndex.toFloat().div(instanceCount.sub(1).max(1)));
  const hashA = Fn(() => sin(instanceIndex.toFloat().mul(13422.9834523498)).mul(0.5).add(0.5));
  const hashB = Fn(() => cos(instanceIndex.toFloat().mul(342378.3423233)).mul(0.5).add(0.5));
  const openAmount = Fn(() => {
    const t = indexT();
    const progress = clamp(animation.div(10), 0, 1);
    const start = pow(float(1).sub(t), animationOrder);
    const jitter = hashA().sub(0.5).mul(animationJitter);
    const threshold = start.mul(animationSpread).add(jitter);
    const linear = clamp(progress.sub(threshold).div(animationDuration), 0, 1);
    return smoothstep(0, 1, linear);
  });

  const rotateX = Fn(([position, angle]: [TslNode, TslNode]) => {
    const cosine = cos(angle);
    const sine = sin(angle);
    return vec3(
      position.x,
      position.y.mul(cosine).sub(position.z.mul(sine)),
      position.y.mul(sine).add(position.z.mul(cosine)),
    );
  });
  const rotateY = Fn(([position, angle]: [TslNode, TslNode]) => {
    const cosine = cos(angle);
    const sine = sin(angle);
    return vec3(
      position.x.mul(cosine).add(position.z.mul(sine)),
      position.y,
      position.z.mul(cosine).sub(position.x.mul(sine)),
    );
  });
  const rotateZ = Fn(([position, angle]: [TslNode, TslNode]) => {
    const cosine = cos(angle);
    const sine = sin(angle);
    return vec3(
      position.x.mul(cosine).sub(position.y.mul(sine)),
      position.x.mul(sine).add(position.y.mul(cosine)),
      position.z,
    );
  });

  const deform = Fn(([position, open]: [TslNode, TslNode]) => {
    const next = position.toVar();
    const along = clamp(position.y.div(length), 0, 1);
    const bloom = smoothstep(0, 1, open);
    const t = indexT();
    const lengthFactor = mix(indexLengthMin, indexLengthMax, pow(t, indexLengthPower));
    const widthFactor = mix(indexWidthMin, indexWidthMax, pow(t, indexWidthPower));
    const variation = mix(float(1).sub(indexVariation.mul(0.35)), float(1).add(indexVariation.mul(0.35)), hashA());
    const bloomGrow = mix(float(0.78), float(1), bloom);
    const scaleOpen = bloomGrow.mul(variation);
    const lengthOpen = lengthFactor;
    const widthOpen = max(float(0.001), widthFactor);
    next.y.mulAssign(lengthOpen.mul(scaleOpen));
    next.x.mulAssign(widthOpen.mul(scaleOpen));
    next.z.mulAssign(widthOpen.mul(scaleOpen));

    const signed = clamp(position.x.div(width.mul(0.5)), -1, 1);
    const signed2 = signed.mul(signed);
    const sidePower = pow(max(signed2, float(1e-5)), 0.85);
    const dome = mix(budDome, bloomDome, bloom);
    const domePower = mix(budDomePower, bloomDomePower, bloom);
    const domeShape = pow(sin(pow(along, 0.85).mul(pi)), domePower);
    const edgeFade = pow(max(float(0), float(1).sub(signed2)), edgePower);
    next.z.addAssign(domeShape.mul(dome).mul(edgeFade).mul(widthOpen.mul(scaleOpen)));
    const grain = sin(along.mul(pi).mul(2.4)).mul(edgeFade).mul(float(0.012));
    next.z.addAssign(grain);

    const spineCurl = mix(budSpine, bloomSpine, bloom);
    const tipWeight = pow(smoothstep(0.55, 1, along), 1.2);
    const tipCurl = mix(budTip, bloomTip, bloom);
    const local = spineCurl.mul(pow(along, 1.35)).add(tipCurl.mul(tipWeight));
    const arc = clamp(local, -1.1, 1.1);
    const grown = length.mul(lengthOpen).mul(scaleOpen);
    const lift = sin(along.mul(pi)).mul(arc).mul(grown).mul(0.42);
    next.z.addAssign(lift);
    next.y.subAssign(abs(lift).mul(along).mul(0.4));
    const rootCurl = mix(budRoot, bloomRoot, bloom);
    const bend = mix(indexBendMin, indexBendMax, t).mul(bloom);
    next.assign(rotateX(next, rootCurl.add(bend)));

    const wave = sin(along.mul(pi.mul(0.9))).mul(0.08);
    const twist = mix(indexTwist.mul(-1), indexTwist, hashB()).mul(along);
    const twistAngle = wave.add(twist).mul(bloom);
    const cosine = cos(twistAngle);
    const sine = sin(twistAngle);
    const twistedX = next.x;
    const twistedZ = next.z;
    next.x.assign(twistedX.mul(cosine).add(twistedZ.mul(sine)));
    next.z.assign(twistedZ.mul(cosine).sub(twistedX.mul(sine)));

    const sideScale = clamp(float(1.15).div(max(width, float(0.25))), 0.35, 1.15);
    const side = mix(budSide, bloomSide, bloom).mul(sidePower).mul(signed).mul(sideScale);
    const pivot = next.y.add(10);
    next.assign(rotateY(next.sub(vec3(0, pivot, 0)), side).add(vec3(0, pivot, 0)));
    const roll = mix(indexVariation.mul(-1), indexVariation, hashB()).mul(t).mul(bloom).mul(0.35);
    next.assign(rotateZ(next, roll));
    next.y.mulAssign(mix(0.84, 1, bloom));
    next.x.mulAssign(mix(0.9, 1, bloom));
    next.z.mulAssign(mix(0.9, 1, bloom));
    return next;
  });

  const hueRotate = Fn(([input, angle]: [TslNode, TslNode]) => {
    const cosine = cos(angle);
    const sine = sin(angle);
    const projection = dot(HUE_AXIS, input);
    const swing = float(1).sub(cosine);
    const rotated = vec3(
      input.x.mul(cosine).add(HUE_AXIS.y.mul(input.z).sub(HUE_AXIS.z.mul(input.y)).mul(sine)).add(HUE_AXIS.x.mul(projection).mul(swing)),
      input.y.mul(cosine).add(HUE_AXIS.z.mul(input.x).sub(HUE_AXIS.x.mul(input.z)).mul(sine)).add(HUE_AXIS.y.mul(projection).mul(swing)),
      input.z.mul(cosine).add(HUE_AXIS.x.mul(input.y).sub(HUE_AXIS.y.mul(input.x)).mul(sine)).add(HUE_AXIS.z.mul(projection).mul(swing)),
    );
    return max(vec3(0, 0, 0), rotated);
  });
  const curve = (value: TslNode, power: number): TslNode => pow(max(value, float(1e-4)), power);

  const surfaceUv = varying(uv());
  const acrossUv = surfaceUv.x;
  const alongUv = surfaceUv.y;
  const signedUv = acrossUv.mul(2).sub(1);
  const signed2 = signedUv.mul(signedUv);
  const edgeBand = signed2;
  const borderBand = smoothstep(0.18, borderWidth, edgeBand);
  const borderInner = smoothstep(0.08, borderWidth, edgeBand);
  const borderOuter = float(1).sub(smoothstep(borderWidth, 1, edgeBand));
  const rootShade = float(1).sub(smoothstep(0, 0.35, alongUv));
  const tipShade = smoothstep(0.68, 1, alongUv);
  const bodyShade = smoothstep(0.08, 0.35, alongUv).mul(float(1).sub(tipShade));
  const hueJitter = mix(float(-0.16), float(0.16), hashA());
  const lightJitter = mix(float(0.88), float(1.12), hashB());
  const bottom = hueRotate(colorBottom, hueShift.add(hueJitter)).mul(lightJitter);
  const top = hueRotate(colorTop, hueShift.add(hueJitter)).mul(lightJitter);
  const tip = hueRotate(colorTip, hueShift.add(hueJitter.mul(0.7))).mul(lightJitter);
  const border = hueRotate(borderColor, hueShift.add(hueJitter.mul(1.2))).mul(lightJitter);
  const vein = hueRotate(veinColor, hueShift.add(hueJitter.mul(0.9))).mul(lightJitter);
  const highlight = hueRotate(highlightColor, hueShift.add(hueJitter.mul(1.5))).mul(lightJitter);
  const gradient = mix(bottom, top, smoothstep(0.02, 0.9, alongUv));
  const bodyHighlight = sin(alongUv.mul(Math.PI)).mul(0.5).add(0.5);
  const withBody = mix(gradient, highlight, bodyHighlight.mul(bodyShade).mul(0.03));
  const withTip = mix(withBody, tip, smoothstep(0.72, 1, alongUv).mul(0.72));
  const fiber = sin(alongUv.mul(54).add(signed2.mul(3)));
  const fiberFine = sin(alongUv.mul(128).add(signedUv.mul(2.5)));
  const fiberMask = max(float(0), float(1).sub(signed2));
  const fiberDark = fiber.mul(0.5).add(0.5).mul(fiberFine.mul(0.35).add(0.65)).mul(fiberMask);
  const withFiber = mix(withTip, withTip.mul(0.9), fiberDark.mul(0.32));
  const spread = mix(float(0.22), float(1), smoothstep(0.02, 0.42, alongUv));
  const veinS = signedUv.div(max(spread, float(0.16)));
  const veinFade = smoothstep(0.05, 0.18, alongUv).mul(float(1).sub(smoothstep(0.78, 0.98, alongUv)));
  const midrib = exp(veinS.mul(veinS).mul(-14)).mul(float(1).sub(smoothstep(0.72, 1, alongUv)));
  const lateral = exp(veinS.sub(0.4).mul(veinS.sub(0.4)).mul(-32))
    .add(exp(veinS.add(0.4).mul(veinS.add(0.4)).mul(-32)))
    .add(exp(veinS.sub(0.74).mul(veinS.sub(0.74)).mul(-44)))
    .add(exp(veinS.add(0.74).mul(veinS.add(0.74)).mul(-44)));
  const veinStrength = midrib.mul(0.62).add(lateral.mul(0.42)).mul(veinFade);
  const withVeins = mix(withFiber, vein, veinStrength.mul(veinIntensity));
  const withMidrib = mix(withVeins, vein, midrib.mul(midribIntensity).mul(0.22).mul(seam));
  const bordered = mix(withMidrib, border, borderInner.mul(borderOuter).mul(borderIntensity));
  const rim = smoothstep(0.28, 0.72, edgeBand).mul(float(1).sub(smoothstep(0.72, 1, edgeBand)));
  const rimColor = mix(border, tip, tipShade);
  const shaded = mix(bordered, rimColor, rim.mul(0.05));

  const facing = clamp(dot(normalView, positionViewDirection), 0, 1);
  const fresnel = curve(float(1).sub(facing), 2.5);
  const edgeGlow = fresnel.mul(borderBand).mul(0.35);
  const wrapLight = smoothstep(-0.6, 0.2, dot(normalWorld, vec3(0.45, 0.8, 0.35)).negate());
  const emissiveNode = bottom.mul(rootShade).mul(0.16)
    .add(shaded.mul(0.22))
    .add(top.mul(curve(wrapLight, 2)).mul(0.06))
    .add(rimColor.mul(fresnel).mul(0.03))
    .add(border.mul(edgeGlow).mul(borderGlow).mul(0.25))
    .add(tip.mul(tipShade).mul(0.03))
    .add(vein.mul(veinStrength).mul(0.04));
  const bodyWeight = pow(max(fiberMask, float(1e-4)), 0.55);
  const thickMask = mix(float(0.14), float(1), bodyWeight);
  const transmissionMask = clamp(transmission.mul(mix(float(1.4), float(0.7), bodyWeight)), 0, 1);

  const opened = openAmount();
  const step = float(0.02);
  const base = positionLocal;
  const origin = deform(base, opened);
  const sample = positionGeometry;
  const sampleOrigin = deform(sample, opened);
  const dx = deform(sample.add(vec3(step, 0, 0)), opened).sub(sampleOrigin);
  const dy = deform(sample.add(vec3(0, step, 0)), opened).sub(sampleOrigin);
  const localNormal = cross(dx, dy).normalize();

  const material = new MeshPhysicalNodeMaterial();
  material.positionNode = origin;
  material.colorNode = shaded;
  const front = float(frontFacing);
  material.emissiveNode = shaded.mul(0.72).add(emissiveNode.mul(front));
  material.roughnessNode = clamp(roughness.add(fiber.mul(0.5).add(0.5).mul(0.05)), 0.04, 1);
  material.metalnessNode = metalness;
  material.iorNode = ior;
  material.transmissionNode = float(0);
  material.thicknessNode = thickness.mul(thickMask);
  material.attenuationDistance = settings.materialAttenuationDistance;
  material.attenuationColor = attenuationColor;
  material.iridescenceNode = iridescence;
  material.iridescenceIOR = 1.3;
  material.iridescenceThicknessRange = [100, 500];
  material.sheenNode = sheenIntensity;
  material.sheenRoughnessNode = float(0.32);
  material.sheenColorNode = mix(vein, tip, 0.35);
  material.clearcoatNode = clearcoat;
  material.clearcoatRoughnessNode = clearcoatRoughness;
  material.side = DoubleSide;
  material.wireframe = settings.wireframe;

  const geometry = createPetalGeometry(settings);
  const mesh = new InstancedMesh(geometry, material, CAPACITY);
  const instanceMatrix = buffer(mesh.instanceMatrix.array, "mat4", CAPACITY).element(instanceIndex);
  material.normalNode = directionToFaceDirection(
    transformNormalToView(transformNormal(localNormal, instanceMatrix)).normalize(),
  );
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const syncUniforms = (): void => {
    length.value = settings.length;
    width.value = settings.width;
    budDome.value = settings.budDome;
    bloomDome.value = settings.bloomDome;
    budDomePower.value = settings.budDomePower;
    bloomDomePower.value = settings.bloomDomePower;
    bloomRootRoundness.value = settings.bloomRootRoundness;
    rootLength.value = settings.rootLength;
    instanceCount.value = settings.instanceCount;
    animation.value = settings.animation;
    budRoot.value = settings.budRoot;
    budSpine.value = settings.budSpine;
    budTip.value = settings.budTip;
    budSide.value = settings.budSide;
    bloomRoot.value = settings.bloomRoot;
    bloomSpine.value = settings.bloomSpine;
    bloomTip.value = settings.bloomTip;
    bloomSide.value = settings.bloomSide;
    edgePower.value = edgePowerFor(settings.petalProfile);
    animationSpread.value = settings.animationSpread;
    animationDuration.value = settings.animationDuration;
    animationOrder.value = settings.animationOrder;
    animationJitter.value = settings.animationJitter;
    indexScaleMin.value = settings.indexScaleMin;
    indexScaleMax.value = settings.indexScaleMax;
    indexScalePower.value = settings.indexScalePower;
    indexLengthMin.value = settings.indexLengthMin;
    indexLengthMax.value = settings.indexLengthMax;
    indexLengthPower.value = settings.indexLengthPower;
    indexWidthMin.value = settings.indexWidthMin;
    indexWidthMax.value = settings.indexWidthMax;
    indexWidthPower.value = settings.indexWidthPower;
    indexBendMin.value = settings.indexBendMin;
    indexBendMax.value = settings.indexBendMax;
    indexTwist.value = settings.indexTwist;
    indexVariation.value = settings.indexVariation;
  };

  const updateMaterial = (): void => {
    colorBottom.value.set(settings.materialColorBottom);
    colorTop.value.set(settings.materialColorTop);
    colorTip.value.set(settings.materialTipColor);
    borderColor.value.set(settings.materialBorderColor);
    veinColor.value.set(settings.materialVeinColor);
    highlightColor.value.set(settings.materialHighlightColor);
    roughness.value = settings.materialRoughness;
    iridescence.value = settings.materialIridescence;
    ior.value = settings.materialIOR;
    borderIntensity.value = settings.materialBorderIntensity;
    borderWidth.value = settings.materialBorderWidth;
    borderGlow.value = settings.materialBorderGlow;
    veinIntensity.value = settings.materialVeinIntensity;
    midribIntensity.value = settings.materialMidribIntensity;
    sheenIntensity.value = settings.materialSheenIntensity;
    transmission.value = settings.materialTransmission;
    thickness.value = settings.materialThickness;
    hueShift.value = settings.materialHueShift;
    seam.value = settings.materialSeam ? 1 : 0;
    metalness.value = settings.materialMetalness;
    clearcoat.value = settings.materialClearcoat;
    clearcoatRoughness.value = settings.materialClearcoatRoughness;
    material.attenuationDistance = settings.materialAttenuationDistance;
    attenuationColor.set(settings.materialAttenuationColor);
    material.wireframe = settings.wireframe;
  };

  const rebuildPetal = (): void => {
    const previous = mesh.geometry;
    mesh.geometry = createPetalGeometry(settings);
    previous.dispose();
  };

  const updateInstances = (): void => {
    const count = writeInstances(mesh, settings);
    settings.instanceCount = count;
    instanceCount.value = count;
  };

  const setWireframe = (enabled: boolean): void => {
    settings.wireframe = enabled;
    material.wireframe = enabled;
  };

  syncUniforms();
  updateMaterial();
  updateInstances();

  return { mesh, syncUniforms, updateMaterial, rebuildPetal, updateInstances, setWireframe };
}
