import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshPhysicalNodeMaterial,
} from "three/webgpu";
import {
  Fn,
  attribute,
  abs,
  clamp,
  cos,
  dot,
  exp,
  float,
  instanceIndex,
  max,
  mix,
  normalFlat,
  positionLocal,
  pow,
  sin,
  smoothstep,
  uniform,
  uv,
  varying,
  vec3,
} from "three/tsl";
import { createAnatomy } from "./anatomy";
import { architectureFor } from "./architecture";
import { createPetalGeometry } from "./petalMesh";
import { writeInstances } from "./place";
import { INNER_KEYS, OUTER_KEYS } from "./shape";
import { PRESETS } from "./presets";
import { bloomState } from "./bloom";
import type { PetalProfile } from "./presets";
import type { FlowerSettings } from "./settings";

function edgePowerFor(profile: PetalProfile): number {
  switch (profile) {
    case "pointed": return 2.15;
    case "round": return 1.05;
    case "rose": return 1.1;
    case "ruffled": return 0.9;
    case "strap": return 1.8;
    case "spoon": return 1.35;
    case "bell": return 0.65;
  }
}

function kindFor(name: string): number {
  const kind = architectureFor(name).kind;
  switch (kind) {
    case "dahlia": return 0;
    case "peony": return 1;
    case "orchid": return 2;
    case "chrysanthemum": return 3;
    case "rosette": return 4;
    case "lily": return 5;
    case "passion": return 6;
    case "rose": return 7;
  }
}

function widthScaleFor(name: string): number {
  switch (architectureFor(name).kind) {
    case "dahlia": return 0.7;
    case "peony": return 0.88;
    case "chrysanthemum": return 0.9;
    case "rosette": return 0.92;
    case "rose": return 1.15;
    case "passion": return 1;
    default: return 1;
  }
}

const CAPACITY = 300;
const HUE_AXIS = vec3(0.57735, 0.57735, 0.57735);

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
  subAssign: (value: unknown) => TslNode;
  assign: (value: unknown) => TslNode;
  toVar: () => TslNode;
  toFloat: () => TslNode;
  negate: () => TslNode;
  normalize: () => TslNode;
};
type NumberUniform = TslNode & { value: number };

function numberUniform(value: number): NumberUniform {
  return uniform(value);
}

export type FlowerView = {
  mesh: Group;
  syncUniforms: () => void;
  updateMaterial: () => void;
  rebuildPetal: () => void;
  updateInstances: () => void;
  setSway: (time: number, strength: number) => void;
  setWireframe: (enabled: boolean) => void;
};

export function createFlower(settings: FlowerSettings): FlowerView {
  const initialArchitecture = architectureFor(settings.name);
  const innerCurve = INNER_KEYS.map((key) => numberUniform(settings[key]));
  const outerCurve = OUTER_KEYS.map((key) => numberUniform(settings[key]));
  const petalCup = numberUniform(settings.petalCup);
  const rootOffset = numberUniform(0);
  const spineOffset = numberUniform(0);
  const tipOffset = numberUniform(0);
  const length = numberUniform(settings.length);
  const width = numberUniform(settings.width);
  const budDome = numberUniform(settings.budDome);
  const bloomDome = numberUniform(settings.bloomDome);
  const budDomePower = numberUniform(settings.budDomePower);
  const bloomDomePower = numberUniform(settings.bloomDomePower);
  const instanceCount = numberUniform(settings.instanceCount);
  const animation = numberUniform(settings.animation);
  const swayTime = numberUniform(0);
  const swayStrength = numberUniform(0);
  const budRoot = numberUniform(settings.budRoot);
  const budSpine = numberUniform(settings.budSpine);
  const budTip = numberUniform(settings.budTip);
  const budSide = numberUniform(settings.budSide);
  const bloomSpine = numberUniform(settings.bloomSpine);
  const bloomTip = numberUniform(settings.bloomTip);
  const bloomSide = numberUniform(settings.bloomSide);
  const rootInner = numberUniform(initialArchitecture.rootInner);
  const rootOuter = numberUniform(initialArchitecture.rootOuter);
  const rootPower = numberUniform(initialArchitecture.rootPower);
  const widthScale = numberUniform(widthScaleFor(settings.name));
  const kind = numberUniform(kindFor(settings.name));
  const edgePower = numberUniform(edgePowerFor(settings.petalProfile));
  const animationSpread = numberUniform(settings.animationSpread);
  const animationDuration = numberUniform(settings.animationDuration);
  const animationOrder = numberUniform(settings.animationOrder);
  const animationJitter = numberUniform(settings.animationJitter);
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
  const thickness = numberUniform(settings.materialThickness);
  const transmission = numberUniform(settings.materialTransmission);
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
    const startAt = clamp(threshold, 0, 0.82);
    const linear = clamp(progress.sub(startAt).div(float(1).sub(startAt).mul(animationDuration).max(0.05)), 0, 1);
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
    const t = attribute("radialT", "float");
    const lengthFactor = mix(indexLengthMin, indexLengthMax, pow(t, indexLengthPower));
    const widthFactor = mix(indexWidthMin, indexWidthMax, pow(t, indexWidthPower));
    const variation = mix(float(1).sub(indexVariation.mul(0.3)), float(1).add(indexVariation.mul(0.3)), hashA());
    const scaleOpen = mix(float(0.76), float(1), bloom).mul(variation);
    const lengthOpen = lengthFactor;
    const widthOpen = max(float(0.001), widthFactor);
    next.x.mulAssign(widthOpen.mul(scaleOpen).mul(widthScale));

    const signed = clamp(position.x.div(width.mul(0.5)), -1, 1);
    const signed2 = signed.mul(signed);
    const sidePower = pow(max(signed2, float(1e-5)), 0.85);
    const dome = mix(budDome, bloomDome, bloom);
    const domePower = mix(budDomePower, bloomDomePower, bloom);
    const domeSine = max(sin(pow(along, 0.85).mul(pi)), float(0));
    const domeShape = pow(domeSine, domePower);
    const edgeFade = pow(max(float(0), float(1).sub(signed2)), edgePower);
    const grown = length.mul(lengthOpen).mul(scaleOpen);
    const bend = mix(indexBendMin, indexBendMax, t).mul(bloom).mul(0.32);
    const chrysanthemum = clamp(float(1).sub(abs(kind.sub(3))), 0, 1);
    const curveT = mix(t, pow(t, 3), chrysanthemum);
    const coefficients = innerCurve.map((value, i) => mix(value, outerCurve[i]!, curveT));
    const tangentAt = (s: TslNode): TslNode => {
      const u = float(1).sub(s);
      const openAngle = coefficients[0]!.mul(u.mul(u).mul(u))
        .add(coefficients[1]!.mul(u.mul(u).mul(s)).mul(3))
        .add(coefficients[2]!.mul(u.mul(s).mul(s)).mul(3))
        .add(coefficients[3]!.mul(s.mul(s).mul(s)))
        .add(rootOffset).add(spineOffset.mul(s)).add(tipOffset.mul(s.mul(s))).add(bend);
      const closedAngle = budRoot.mul(0.65).add(budSpine.mul(s))
        .sub(budTip.add(0.65).mul(s.mul(s)));
      return mix(closedAngle, openAngle, bloom);
    };
    const radius = float(0).toVar();
    const height = float(0).toVar();
    for (let step = 0; step < 16; step++) {
      const s = along.mul((step + 0.5) / 16);
      const theta = tangentAt(s);
      radius.addAssign(sin(theta).mul(along).div(16));
      height.addAssign(cos(theta).mul(along).div(16));
    }
    const endAngle = tangentAt(along);
    const cup = signed2.mul(width).mul(widthOpen).mul(petalCup).mul(0.42)
      .mul(smoothstep(0, 0.25, along)).mul(sin(along.mul(pi)).max(0));
    const domeLift = domeShape.mul(dome).mul(edgeFade).mul(widthOpen.mul(scaleOpen));
    next.y.assign(height.mul(grown).add(cup.mul(sin(endAngle))));
    next.z.assign(radius.mul(grown).sub(cup.mul(cos(endAngle))).add(domeLift));
    // Rose petals wrap around the axis instead of intersecting as flat radial fans.
    const isRose = clamp(float(1).sub(abs(kind.sub(7))), 0, 1);
    const isPeony = clamp(float(1).sub(abs(kind.sub(1))), 0, 1);
    const isDahlia = clamp(float(1).sub(abs(kind)), 0, 1);
    const wrapWeight = isRose.add(isPeony.mul(0.9)).add(isDahlia.mul(0.75)).mul(bloom);
    const attachment = attribute("attachmentRadius", "float");
    const roseRadius = radius.mul(grown).add(attachment).max(0.06);
    const wrapAngle = clamp(next.x.div(roseRadius), -1.5, 1.5);
    const wrappedX = sin(wrapAngle).mul(roseRadius);
    const wrappedZ = cos(wrapAngle).mul(roseRadius).sub(attachment);
    next.x.assign(mix(next.x, wrappedX, wrapWeight));
    next.z.assign(mix(next.z, wrappedZ, wrapWeight));
    next.z.subAssign(attribute("attachmentRadius", "float").mul(float(1).sub(bloom)).mul(0.8));
    // Nested closed shells meet at the bud tip instead of crossing through the axis.
    const closedRadius = sin(along.mul(pi)).max(0).mul(length).mul(0.38).mul(budRoot.mul(0.15).add(1))
      .mul(mix(0.8, 1, t)).add(float(1).sub(along).mul(attachment).mul(0.2));
    const closedWrap = clamp(position.x.div(closedRadius.add(0.1)), -1.3, 1.3);
    const closedX = sin(closedWrap).mul(closedRadius);
    const closedZ = cos(closedWrap).mul(closedRadius).sub(attachment);
    const closedY = along.mul(length.mul(0.94).sub(attribute("attachmentHeight", "float")));
    const closedWeight = float(1).sub(bloom).mul(float(1).sub(clamp(float(1).sub(abs(kind.sub(2))), 0, 1)));
    next.x.assign(mix(next.x, closedX, closedWeight));
    next.y.assign(mix(next.y, closedY, closedWeight));
    next.z.assign(mix(next.z, closedZ, closedWeight));

    const twist = mix(indexTwist.mul(-1), indexTwist, hashB()).mul(along).mul(bloom);
    const cosine = cos(twist);
    const sine = sin(twist);
    const twistedX = next.x.toVar();
    const twistedZ = next.z.toVar();
    next.x.assign(twistedX.mul(cosine).add(twistedZ.mul(sine)));
    next.z.assign(twistedZ.mul(cosine).sub(twistedX.mul(sine)));

    const sideScale = clamp(float(1.15).div(max(width, float(0.25))), 0.35, 1.15);
    const side = mix(budSide, bloomSide, bloom).mul(sidePower).mul(signed).mul(sideScale);
    next.assign(rotateY(next, side));
    const roll = mix(indexVariation.mul(-1), indexVariation, hashB()).mul(t).mul(bloom).mul(0.2);
    next.assign(rotateZ(next, roll));
    next.y.mulAssign(mix(0.86, 1, bloom));
    next.x.mulAssign(mix(0.9, 1, bloom));
    next.z.mulAssign(mix(0.9, 1, bloom));
    const orchid = clamp(float(1).sub(abs(kind.sub(2))), 0, 1);
    const phi = instanceIndex.toFloat().mul(Math.PI * 2).div(instanceCount.max(1));
    const orchidBudWorld = vec3(sin(phi).mul(closedRadius), along.mul(length).mul(0.94), cos(phi).mul(closedRadius))
      .sub(attribute("petalOffset", "vec3"));
    const orchidBudLocal = rotateX(rotateZ(orchidBudWorld, attribute("tepalAngle", "float").negate()), float(0.95))
      .div(attribute("petalScale", "vec3").max(0.05));
    next.assign(mix(next, orchidBudLocal, orchid.mul(float(1).sub(bloom))));
    const wind = sin(swayTime.mul(1.15).add(hashA().mul(1.8)))
      .mul(swayStrength)
      .mul(pow(along, 1.7))
      .mul(0.055);
    next.x.addAssign(wind);
    next.z.addAssign(wind.mul(0.35));
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
  const surfaceUv = varying(uv());
  const acrossUv = surfaceUv.x;
  const alongUv = surfaceUv.y;
  const signedUv = acrossUv.mul(2).sub(1);
  const signed2 = signedUv.mul(signedUv);
  const borderInner = smoothstep(0.08, borderWidth, signed2);
  const borderOuter = float(1).sub(smoothstep(borderWidth, 1, signed2));
  const rootShade = float(1).sub(smoothstep(0, 0.35, alongUv));
  const tipShade = smoothstep(0.68, 1, alongUv);
  const bodyShade = smoothstep(0.08, 0.35, alongUv).mul(float(1).sub(tipShade));
  const hueJitter = mix(float(-0.045), float(0.045), hashA());
  const lightJitter = mix(float(0.92), float(1.06), hashB());
  const bottom = hueRotate(colorBottom, hueShift.add(hueJitter)).mul(lightJitter);
  const top = hueRotate(colorTop, hueShift.add(hueJitter)).mul(lightJitter);
  const tip = hueRotate(colorTip, hueShift.add(hueJitter.mul(0.7))).mul(lightJitter);
  const border = hueRotate(borderColor, hueShift.add(hueJitter.mul(1.2))).mul(lightJitter);
  const vein = hueRotate(veinColor, hueShift.add(hueJitter.mul(0.9))).mul(lightJitter);
  const highlight = hueRotate(highlightColor, hueShift.add(hueJitter.mul(1.5))).mul(lightJitter);
  const gradient = mix(bottom, top, smoothstep(0.02, 0.9, alongUv));
  const bodyHighlight = sin(alongUv.mul(Math.PI)).mul(0.5).add(0.5);
  const withBody = mix(gradient, highlight, bodyHighlight.mul(bodyShade).mul(0.025));
  const withTip = mix(withBody, tip, smoothstep(0.76, 1, alongUv).mul(0.58));
  const fiber = sin(alongUv.mul(54).add(signed2.mul(3)));
  const fiberFine = sin(alongUv.mul(128).add(signedUv.mul(2.5)));
  const fiberMask = max(float(0), float(1).sub(signed2));
  const fiberDark = fiber.mul(0.5).add(0.5).mul(fiberFine.mul(0.35).add(0.65)).mul(fiberMask);
  const withFiber = mix(withTip, withTip.mul(0.93), fiberDark.mul(0.24));
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
  const withMidrib = mix(withVeins, vein, midrib.mul(midribIntensity).mul(0.18).mul(seam));
  const bordered = mix(withMidrib, border, borderInner.mul(borderOuter).mul(borderIntensity));
  const rim = smoothstep(0.28, 0.72, signed2).mul(float(1).sub(smoothstep(0.72, 1, signed2)));
  const rimColor = mix(border, tip, tipShade);
  const isLily = clamp(float(1).sub(abs(kind.sub(5))), 0, 1);
  const speckleWave = sin(signedUv.mul(31).add(alongUv.mul(73)))
    .mul(sin(signedUv.mul(67).sub(alongUv.mul(41))));
  const speckles = smoothstep(0.68, 0.9, speckleWave)
    .mul(smoothstep(0.12, 0.32, alongUv))
    .mul(float(1).sub(smoothstep(0.68, 0.9, alongUv)))
    .mul(isLily);
  const shaded = mix(mix(bordered, rimColor, rim.mul(0.04)), vein, speckles.mul(0.82));

  const isBell = clamp(float(1).sub(abs(kind.sub(6))), 0, 1);
  const subsurface = mix(float(0.32), float(0.72), isBell);
  const emissiveNode = bottom.mul(rootShade).mul(0.025)
    .add(shaded.mul(subsurface));
  const bodyWeight = pow(max(fiberMask, float(1e-4)), 0.55);
  const thickMask = mix(float(0.14), float(1), bodyWeight);

  const opened = openAmount();
  const origin = deform(positionLocal, opened);

  const material = new MeshPhysicalNodeMaterial();
  material.positionNode = origin;
  material.normalNode = normalFlat;
  material.colorNode = shaded;
  material.emissiveNode = emissiveNode;
  material.roughnessNode = clamp(roughness.add(fiber.mul(0.5).add(0.5).mul(0.035)), 0.08, 1);
  material.metalnessNode = metalness;
  material.iorNode = ior;
  material.transmissionNode = transmission;
  material.thicknessNode = thickness.mul(thickMask);
  material.attenuationDistance = settings.materialAttenuationDistance;
  material.attenuationColor = attenuationColor;
  material.iridescenceNode = iridescence;
  material.iridescenceIOR = 1.3;
  material.iridescenceThicknessRange = [100, 500];
  material.clearcoatNode = clearcoat;
  material.clearcoatRoughnessNode = clearcoatRoughness;
  material.side = DoubleSide;
  material.wireframe = settings.wireframe;

  const geometry = createPetalGeometry(settings);
  const petals = new InstancedMesh(geometry, material, CAPACITY);
  petals.frustumCulled = false;
  petals.castShadow = false;
  petals.receiveShadow = false;
  const anatomy = createAnatomy(settings);
  const group = new Group();
  const petalHead = new Group();
  petalHead.add(petals);
  group.add(petalHead, anatomy.group);

  const syncUniforms = (): void => {
    const architecture = architectureFor(settings.name);
    for (let i = 0; i < 4; i++) {
      innerCurve[i]!.value = settings[INNER_KEYS[i]!];
      outerCurve[i]!.value = settings[OUTER_KEYS[i]!];
    }
    petalCup.value = settings.petalCup;
    const reference = PRESETS.find((preset) => preset.name === settings.name)!;
    rootOffset.value = settings.bloomRoot - reference.bloomRoot;
    spineOffset.value = settings.bloomSpine - reference.bloomSpine;
    tipOffset.value = settings.bloomTip - reference.bloomTip;
    group.rotation.set(0, 0, 0);
    petals.visible = true;
    const state = bloomState(settings.animation / 10, settings.closedScale);
    anatomy.setBloom(state.open);
    petalHead.scale.setScalar(state.scale);
    anatomy.head.scale.setScalar(state.scale);
    length.value = settings.length;
    width.value = settings.width;
    budDome.value = settings.budDome;
    bloomDome.value = settings.bloomDome;
    budDomePower.value = settings.budDomePower;
    bloomDomePower.value = settings.bloomDomePower;
    instanceCount.value = settings.instanceCount;
    animation.value = state.open * 10;
    budRoot.value = settings.budRoot;
    budSpine.value = settings.budSpine;
    budTip.value = settings.budTip;
    budSide.value = settings.budSide;
    bloomSpine.value = settings.bloomSpine;
    bloomTip.value = settings.bloomTip;
    bloomSide.value = settings.bloomSide;
    rootInner.value = architecture.rootInner;
    rootOuter.value = architecture.rootOuter;
    rootPower.value = architecture.rootPower;
    widthScale.value = widthScaleFor(settings.name);
    kind.value = kindFor(settings.name);
    edgePower.value = edgePowerFor(settings.petalProfile);
    animationSpread.value = settings.animationSpread;
    animationDuration.value = settings.animationDuration;
    animationOrder.value = settings.animationOrder;
    animationJitter.value = settings.animationJitter;
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
    thickness.value = settings.materialThickness;
    transmission.value = settings.materialTransmission;
    hueShift.value = settings.materialHueShift;
    seam.value = settings.materialSeam ? 1 : 0;
    metalness.value = settings.materialMetalness;
    clearcoat.value = settings.materialClearcoat;
    clearcoatRoughness.value = settings.materialClearcoatRoughness;
    material.attenuationDistance = settings.materialAttenuationDistance;
    attenuationColor.set(settings.materialAttenuationColor);
    material.wireframe = settings.wireframe;
    anatomy.update();
  };

  const rebuildPetal = (): void => {
    const previous = petals.geometry;
    petals.geometry = createPetalGeometry(settings);
    writeInstances(petals, settings);
    previous.dispose();
    anatomy.rebuild();
  };

  const updateInstances = (): void => {
    const count = writeInstances(petals, settings);
    settings.instanceCount = count;
    instanceCount.value = count;
  };

  const setSway = (time: number, strength: number): void => {
    swayTime.value = time;
    swayStrength.value = strength;
    anatomy.setSway(time, strength);
  };

  const setWireframe = (enabled: boolean): void => {
    settings.wireframe = enabled;
    material.wireframe = enabled;
    anatomy.setWireframe(enabled);
  };

  syncUniforms();
  updateMaterial();
  updateInstances();
  return { mesh: group, syncUniforms, updateMaterial, rebuildPetal, updateInstances, setSway, setWireframe };
}
