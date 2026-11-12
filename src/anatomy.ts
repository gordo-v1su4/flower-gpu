import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalNodeMaterial,
  SphereGeometry,
  Vector2,
} from "three/webgpu";
import { abs, clamp, float, mix, positionLocal, pow, sin, smoothstep, uniform, uv, vec3 } from "three/tsl";
import { architectureFor } from "./architecture";
import { createPetalGeometry } from "./petalMesh";
import type { FlowerSettings } from "./settings";

export type FlowerAnatomy = {
  group: Group;
  update: () => void;
  rebuild: () => void;
  setBloom: (value: number) => void;
  setSway: (time: number, strength: number) => void;
  setWireframe: (enabled: boolean) => void;
};

function solid(color: string, roughness = 0.65): MeshPhysicalNodeMaterial {
  return new MeshPhysicalNodeMaterial({ color, roughness, metalness: 0 });
}

export function createAnatomy(settings: FlowerSettings): FlowerAnatomy {
  const group = new Group();
  const stemMaterial = solid("#274f3b", 0.82);
  const leafMaterial = solid("#356a48", 0.72);
  leafMaterial.side = DoubleSide;
  const centerMaterial = solid(settings.materialColorBottom, 0.78);
  const filamentMaterial = solid("#f3d9b0", 0.56);
  const antherMaterial = solid("#b86528", 0.7);
  const lipBottom = uniform(new Color(settings.materialTipColor));
  const lipTop = uniform(new Color(settings.materialColorTop));
  const lipHighlight = uniform(new Color("#f2bd45"));
  const lipMaterial = new MeshPhysicalNodeMaterial({ roughness: 0.58, side: DoubleSide });
  const lipUv = uv();
  const across = lipUv.x.sub(0.5);
  const throat = float(1).sub(smoothstep(0.04, 0.24, abs(across)))
    .mul(smoothstep(0.08, 0.34, lipUv.y))
    .mul(float(1).sub(smoothstep(0.62, 0.92, lipUv.y)));
  lipMaterial.colorNode = mix(mix(lipBottom, lipTop, lipUv.y.mul(0.38)), lipHighlight, throat.mul(0.9));
  lipMaterial.sheen = 0.3;

  const stem = new Mesh(new CylinderGeometry(0.026, 0.042, 2.7, 12), stemMaterial);
  stem.position.y = -1.35;
  group.add(stem);

  const leafSettings: FlowerSettings = {
    ...settings,
    length: 0.92,
    width: 0.38,
    petalProfile: "pointed",
    baseWidth: 0.08,
    tipWidth: 0.12,
    bloomRootRoundness: 0.16,
    rootLength: 0.24,
  };
  let leafGeometry = createPetalGeometry(leafSettings);
  const leftLeaf = new Mesh(leafGeometry, leafMaterial);
  leftLeaf.position.set(-0.015, -1.45, 0);
  leftLeaf.rotation.set(-0.35, -0.35, 1.06);
  const rightLeaf = new Mesh(leafGeometry, leafMaterial);
  rightLeaf.position.set(0.015, -0.94, 0.01);
  rightLeaf.rotation.set(0.42, 2.7, -1.12);
  rightLeaf.scale.setScalar(0.82);
  group.add(leftLeaf, rightLeaf);

  const center = new Mesh(new SphereGeometry(0.2, 32, 18), centerMaterial);
  center.scale.set(1, 0.46, 1);
  center.position.y = 0.075;
  group.add(center);

  const stamens = new Group();
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3 + 0.25;
    const filament = new Mesh(new CylinderGeometry(0.011, 0.014, 0.54, 8), filamentMaterial);
    filament.position.set(Math.sin(angle) * 0.11, 0.31, Math.cos(angle) * 0.11);
    filament.rotation.set(Math.cos(angle) * 0.2, 0, -Math.sin(angle) * 0.2);
    const anther = new Mesh(new SphereGeometry(0.055, 12, 8), antherMaterial);
    anther.scale.set(0.65, 1.45, 0.65);
    anther.position.set(Math.sin(angle) * 0.16, 0.59, Math.cos(angle) * 0.16);
    anther.rotation.y = angle;
    stamens.add(filament, anther);
  }
  group.add(stamens);

  const column = new Mesh(new SphereGeometry(0.14, 24, 16), filamentMaterial);
  column.scale.set(0.75, 1.35, 0.8);
  column.position.set(0, 0.19, 0.12);
  group.add(column);

  let lipGeometry = createPetalGeometry({
    ...settings,
    petalProfile: "spoon",
    length: 1.02,
    width: 0.82,
    baseWidth: 0.18,
    tipWidth: 0.94,
    bloomRootRoundness: 0.52,
    rootLength: 0.2,
  });
  const lip = new Mesh(lipGeometry, lipMaterial);
  lip.position.set(0, 0.07, 0.11);
  lip.rotation.x = 1.82;
  lip.scale.setScalar(0.78);
  group.add(lip);

  const bellOpen = uniform(settings.animation / 10);
  const bellTime = uniform(0);
  const bellWind = uniform(0);
  const bellBottom = uniform(new Color(settings.materialColorBottom));
  const bellTop = uniform(new Color(settings.materialColorTop));
  const bellMaterial = new MeshPhysicalNodeMaterial({ roughness: 0.52, side: DoubleSide });
  const bellAlong = clamp(float(0.38).sub(positionLocal.y).div(1.24), 0, 1);
  const bellFlare = float(1).add(bellOpen.mul(0.12).mul(pow(bellAlong, 3)));
  const bellSway = sin(bellTime.mul(1.1)).mul(bellWind).mul(pow(bellAlong, 2)).mul(0.06);
  bellMaterial.positionNode = vec3(
    positionLocal.x.mul(bellFlare).add(bellSway),
    positionLocal.y,
    positionLocal.z.mul(bellFlare),
  );
  const bellSeam = pow(sin(uv().x.mul(Math.PI * 12)).mul(0.5).add(0.5), 18).mul(0.16);
  const bellGradient = mix(bellBottom, bellTop, smoothstep(-0.86, 0.34, positionLocal.y));
  const bellShaded = mix(bellGradient, bellBottom, bellSeam);
  bellMaterial.colorNode = bellShaded;
  bellMaterial.emissiveNode = bellShaded.mul(0.24);
  bellMaterial.sheen = 0.35;
  const bellProfile = [
    new Vector2(0.1, 0.38),
    new Vector2(0.15, 0.3),
    new Vector2(0.18, 0.1),
    new Vector2(0.26, -0.15),
    new Vector2(0.38, -0.42),
    new Vector2(0.48, -0.68),
    new Vector2(0.53, -0.78),
    new Vector2(0.56, -0.82),
    new Vector2(0.53, -0.87),
    new Vector2(0.48, -0.82),
  ];
  const bellCup = new Mesh(new LatheGeometry(bellProfile, 48), bellMaterial);
  group.add(bellCup);

  const update = (): void => {
    const architecture = architectureFor(settings.name);
    const isBell = architecture.kind === "bell";
    centerMaterial.color.set(settings.materialColorBottom);
    lipBottom.value.set(settings.materialTipColor);
    lipTop.value.set(settings.materialColorTop);
    bellBottom.value.set(settings.materialColorBottom);
    bellTop.value.set(settings.materialColorTop);
    bellCup.visible = isBell;
    center.visible = architecture.centerScale > 0 && !isBell;
    center.position.y = 0.075;
    center.scale.set(architecture.centerScale, architecture.centerScale * 0.46, architecture.centerScale);
    stamens.visible = architecture.kind === "lily" || isBell;
    stamens.rotation.x = isBell ? Math.PI : 0;
    stamens.position.y = isBell ? 0.35 : 0;
    stamens.scale.setScalar(isBell ? 0.72 : 1);
    column.visible = architecture.kind === "orchid";
    lip.visible = architecture.kind === "orchid";
    stem.visible = architecture.kind !== "rosette";
    leftLeaf.visible = architecture.kind !== "rosette";
    rightLeaf.visible = architecture.kind !== "rosette";
  };

  const rebuild = (): void => {
    const previousLeaf = leafGeometry;
    const previousLip = lipGeometry;
    leafGeometry = createPetalGeometry(leafSettings);
    lipGeometry = createPetalGeometry({
      ...settings,
      petalProfile: "spoon",
      length: 1.02,
      width: 0.82,
      baseWidth: 0.18,
      tipWidth: 0.94,
      bloomRootRoundness: 0.52,
      rootLength: 0.2,
    });
    leftLeaf.geometry = leafGeometry;
    rightLeaf.geometry = leafGeometry;
    lip.geometry = lipGeometry;
    previousLeaf.dispose();
    previousLip.dispose();
  };

  const setBloom = (value: number): void => {
    bellOpen.value = value;
  };
  const setSway = (time: number, strength: number): void => {
    bellTime.value = time;
    bellWind.value = strength;
  };
  const setWireframe = (enabled: boolean): void => {
    group.traverse((object) => {
      if (object instanceof Mesh) {
        const material = object.material as MeshPhysicalNodeMaterial;
        material.wireframe = enabled;
      }
    });
  };

  update();
  return { group, update, rebuild, setBloom, setSway, setWireframe };
}
