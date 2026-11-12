import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhysicalNodeMaterial,
  Object3D,
  SphereGeometry,
} from "three/webgpu";
import { abs, float, mix, smoothstep, uniform, uv } from "three/tsl";
import { architectureFor } from "./architecture";
import { createPassionAnatomy } from "./passionflower";
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

function createPeonyStamens(): Group {
  const group = new Group();
  const count = 48;
  const filaments = new InstancedMesh(
    new CylinderGeometry(0.007, 0.009, 0.2, 6),
    solid("#e8b84c", 0.65),
    count,
  );
  const anthers = new InstancedMesh(
    new SphereGeometry(0.03, 10, 7),
    solid("#d99625", 0.58),
    count,
  );
  const dummy = new Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963229728653;
    const radius = 0.035 + 0.22 * Math.sqrt((index + 0.5) / count);
    const height = 0.22 + (1 - radius / 0.28) * 0.12 + Math.sin(index * 7.31) * 0.018;
    dummy.position.set(Math.sin(angle) * radius, 0.16 + height * 0.5, Math.cos(angle) * radius);
    dummy.rotation.set(Math.cos(angle) * 0.13, angle, -Math.sin(angle) * 0.13);
    dummy.scale.set(1, height / 0.2, 1);
    dummy.updateMatrix();
    filaments.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 0.18 + height;
    dummy.scale.set(0.8, 1.35, 0.8);
    dummy.updateMatrix();
    anthers.setMatrixAt(index, dummy.matrix);
  }
  filaments.instanceMatrix.needsUpdate = true;
  anthers.instanceMatrix.needsUpdate = true;
  group.add(filaments, anthers);
  return group;
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

  const peonyStamens = createPeonyStamens();
  group.add(peonyStamens);
  const passion = createPassionAnatomy();
  group.add(passion.group);

  const column = new Mesh(new SphereGeometry(0.14, 24, 16), filamentMaterial);
  column.scale.set(0.75, 1.35, 0.8);
  column.position.set(0, 0.22, 0.36);
  group.add(column);

  let lipGeometry = createPetalGeometry({
    ...settings,
    petalProfile: "ruffled",
    length: 0.86,
    width: 1.08,
    baseWidth: 0.18,
    tipWidth: 0.96,
    bloomRootRoundness: 0.72,
    rootLength: 0.18,
  });
  const lip = new Mesh(lipGeometry, lipMaterial);
  lip.position.set(0, 0.12, 0.34);
  lip.rotation.set(0.2, 0, Math.PI);
  lip.scale.setScalar(0.9);
  group.add(lip);

  const update = (): void => {
    const architecture = architectureFor(settings.name);
    centerMaterial.color.set(settings.materialColorBottom);
    lipBottom.value.set(settings.materialTipColor);
    lipTop.value.set(settings.materialColorTop);
    center.visible = architecture.centerScale > 0 && architecture.kind !== "passion";
    center.position.y = 0.075;
    center.scale.set(architecture.centerScale, architecture.centerScale * 0.46, architecture.centerScale);
    stamens.visible = architecture.kind === "lily";
    peonyStamens.visible = architecture.kind === "peony";
    passion.group.visible = architecture.kind === "passion";
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
      petalProfile: "ruffled",
      length: 0.86,
      width: 1.08,
      baseWidth: 0.18,
      tipWidth: 0.96,
      bloomRootRoundness: 0.72,
      rootLength: 0.18,
    });
    leftLeaf.geometry = leafGeometry;
    rightLeaf.geometry = leafGeometry;
    lip.geometry = lipGeometry;
    previousLeaf.dispose();
    previousLip.dispose();
  };

  const setBloom = (value: number): void => {
    passion.setBloom(value);
  };
  const setSway = (time: number, strength: number): void => {
    passion.setSway(time, strength);
  };
  const setWireframe = (enabled: boolean): void => {
    group.traverse((object) => {
      if (object instanceof Mesh) {
        const material = object.material as MeshPhysicalNodeMaterial;
        material.wireframe = enabled;
      }
    });
    passion.setWireframe(enabled);
  };

  update();
  return { group, update, rebuild, setBloom, setSway, setWireframe };
}
